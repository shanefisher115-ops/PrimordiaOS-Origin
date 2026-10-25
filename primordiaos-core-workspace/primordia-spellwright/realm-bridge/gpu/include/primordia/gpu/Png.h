// Writes RGBA8 images as PNG without a compression library (stored deflate blocks).
// Used for headless frames; files are larger than a compressed PNG but every viewer opens them.
#pragma once

#include <cstdint>
#include <string>
#include <vector>

namespace primordia::gpu
{
bool WritePngRgba(const std::string& Path, uint32_t Width, uint32_t Height, const std::vector<uint8_t>& Rgba);
}
