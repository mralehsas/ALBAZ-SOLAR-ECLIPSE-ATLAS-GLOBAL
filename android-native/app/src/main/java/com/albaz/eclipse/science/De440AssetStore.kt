package com.albaz.eclipse.science

import android.content.Context
import android.content.res.AssetManager
import com.albaz.eclipse.core.integrity.De440Integrity
import com.albaz.eclipse.core.integrity.IntegrityStatus
import com.albaz.eclipse.core.spk.De440SpkKernel
import java.io.FileInputStream
import java.io.FileNotFoundException
import java.io.IOException
import java.security.MessageDigest
import kotlin.math.sqrt

data class De440RuntimeState(
    val status: IntegrityStatus,
    val message: String,
    val sunDistanceKmAtJ2000: Double? = null,
    val moonDistanceKmAtJ2000: Double? = null
)

/** Runtime bridge for the full, uncompressed DE440 asset injected at build time. */
object De440AssetStore {
    private const val ASSET_NAME = De440Integrity.FULL_KERNEL_NAME
    private const val PREFS = "de440_integrity"
    private const val MARKER_KEY = "verified_sha256"

    fun prepare(context: Context): De440RuntimeState {
        val descriptor = try {
            context.assets.openFd(ASSET_NAME)
        } catch (_: FileNotFoundException) {
            return De440RuntimeState(IntegrityStatus.MISSING, "DE440 asset missing")
        } catch (e: IOException) {
            return De440RuntimeState(IntegrityStatus.MISSING, e.message ?: "DE440 asset unavailable")
        }
        descriptor.use { afd ->
            if (afd.length != De440Integrity.FULL_KERNEL_SIZE) {
                clearMarker(context)
                return De440RuntimeState(IntegrityStatus.CORRUPT, "DE440 size mismatch: ${afd.length}/${De440Integrity.FULL_KERNEL_SIZE}")
            }
        }

        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        if (!prefs.getString(MARKER_KEY, null).equals(De440Integrity.FULL_KERNEL_SHA256, ignoreCase = true)) {
            val actualHash = try { hashAsset(context.assets) } catch (e: IOException) {
                clearMarker(context)
                return De440RuntimeState(IntegrityStatus.CORRUPT, e.message ?: "DE440 hash read failed")
            }
            if (!actualHash.equals(De440Integrity.FULL_KERNEL_SHA256, ignoreCase = true)) {
                clearMarker(context)
                return De440RuntimeState(IntegrityStatus.CORRUPT, "DE440 SHA-256 mismatch: $actualHash")
            }
            prefs.edit().putString(MARKER_KEY, De440Integrity.FULL_KERNEL_SHA256).apply()
        }
        return smoke(context)
    }

    private fun smoke(context: Context): De440RuntimeState = try {
        context.assets.openFd(ASSET_NAME).use { afd ->
            FileInputStream(afd.fileDescriptor).use { input ->
                De440SpkKernel.openChannel(input.channel, afd.startOffset, afd.length, false).use { spk ->
                    val sun = spk.positionGeocentric(De440SpkKernel.SUN, 0.0)
                    val moon = spk.positionGeocentric(De440SpkKernel.MOON, 0.0)
                    val sunDistance = norm(sun.x, sun.y, sun.z)
                    val moonDistance = norm(moon.x, moon.y, moon.z)
                    require(sunDistance in 140_000_000.0..155_000_000.0) { "DE440 Sun smoke distance invalid" }
                    require(moonDistance in 300_000.0..450_000.0) { "DE440 Moon smoke distance invalid" }
                    De440RuntimeState(
                        IntegrityStatus.VERIFIED,
                        "DE440 SHA-256 + native DAF/SPK Type-2 verified",
                        sunDistance,
                        moonDistance
                    )
                }
            }
        }
    } catch (t: Throwable) {
        clearMarker(context)
        De440RuntimeState(IntegrityStatus.CORRUPT, t.message ?: "DE440 SPK smoke test failed")
    }

    private fun hashAsset(assets: AssetManager): String {
        val digest = MessageDigest.getInstance("SHA-256")
        val buffer = ByteArray(1024 * 1024)
        assets.open(ASSET_NAME, AssetManager.ACCESS_STREAMING).use { input ->
            while (true) {
                val n = input.read(buffer)
                if (n < 0) break
                if (n == 0) continue
                digest.update(buffer, 0, n)
            }
        }
        return digest.digest().joinToString("") { "%02x".format(it.toInt() and 0xff) }
    }

    private fun clearMarker(context: Context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().remove(MARKER_KEY).apply()
    }
    private fun norm(x: Double, y: Double, z: Double): Double = sqrt(x * x + y * y + z * z)
}
