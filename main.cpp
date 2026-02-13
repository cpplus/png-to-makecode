#include <iostream>
#include <fstream>
#include <vector>
#include <string>
#include <algorithm>
#include <unordered_map>
#include <unordered_set>

#define STB_IMAGE_IMPLEMENTATION
#include "stb_image.h"

// Character set for encoding
static const std::string chars =
"abcdefghijklmnopqrstuvwxyz"
"ABCDEFGHIJKLMNOPQRSTUVWXYZ"
"0123456789"
"!@#$%^&*()-_=+[]{};:,.?";

// ------------------------------------------------------------
// PNG trimming + pixel extraction
// ------------------------------------------------------------
struct PNGTiles {
    int width = 0;
    int height = 0;
    int offsetX = 0;
    int offsetY = 0;
    std::vector<uint32_t> pixels; // RGB only
};

static PNGTiles processPNG(const std::string& path) {
    PNGTiles out;

    int width = 0, height = 0, channels = 0;
    unsigned char* data = stbi_load(path.c_str(), &width, &height, &channels, 4);
    if (!data) {
        std::cerr << "Failed to load PNG: " << path << "\n";
        return out;
    }

    // Find bounding box of non-transparent pixels
    int minX = width, minY = height, maxX = -1, maxY = -1;

    for (int y = 0; y < height; y++) {
        for (int x = 0; x < width; x++) {
            int idx = (y * width + x) * 4;
            int a = data[idx + 3];
            if (a != 0) {
                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
            }
        }
    }

    // Fully transparent image
    if (maxX < minX || maxY < minY) {
        stbi_image_free(data);
        return out;
    }

    out.offsetX = minX;
    out.offsetY = minY;
    out.width = maxX - minX + 1;
    out.height = maxY - minY + 1;

    out.pixels.reserve(out.width * out.height);

    for (int y = minY; y <= maxY; y++) {
        for (int x = minX; x <= maxX; x++) {
            int idx = (y * width + x) * 4;
            int r = data[idx + 0];
            int g = data[idx + 1];
            int b = data[idx + 2];
            uint32_t rgb = (r << 16) | (g << 8) | b;
            out.pixels.push_back(rgb);
        }
    }

    stbi_image_free(data);
    return out;
}

// ------------------------------------------------------------
// Main program
// ------------------------------------------------------------
int main() {
    std::cout << "How many PNG files do you want to process: ";
    int count;
    std::cin >> count;

    std::vector<std::string> pngFiles;
    pngFiles.reserve(count);

    for (int i = 0; i < count; i++) {
        std::cout << "Enter PNG file path #" << (i + 1) << ": ";
        std::string path;
        std::cin >> path;
        pngFiles.push_back(path);
    }

    // Process PNGs
    std::vector<PNGTiles> pngResults;
    for (auto& file : pngFiles) {
        pngResults.push_back(processPNG(file));
    }

    // Build global palette
    std::unordered_set<uint32_t> paletteSet;
    for (auto& png : pngResults)
        for (auto c : png.pixels)
            paletteSet.insert(c);

    std::vector<uint32_t> globalColors(paletteSet.begin(), paletteSet.end());
    std::sort(globalColors.begin(), globalColors.end());

    // Map color -> index
    std::unordered_map<uint32_t, int> colorToIndex;
    for (int i = 0; i < (int)globalColors.size(); i++)
        colorToIndex[globalColors[i]] = i;

    // Encode PNGs
    std::vector<std::tuple<int, int, int, int, std::string>> encodedPNGs;

    for (auto& png : pngResults) {
        if (png.width == 0 || png.height == 0 || png.pixels.empty()) {
            encodedPNGs.emplace_back(0, 0, 0, 0, "");
            continue;
        }

        std::string encoded;
        encoded.reserve(png.pixels.size() * 2);

        int charsLen = chars.length();

        for (auto rgb : png.pixels) {
            int idx = colorToIndex[rgb];
            char a = chars[idx / charsLen];
            char b = chars[idx % charsLen];
            encoded.push_back(a);
            encoded.push_back(b);
        }

        encodedPNGs.emplace_back(png.width, png.height, png.offsetX, png.offsetY, encoded);
    }

    // Write output
    std::ofstream out("output.txt");
    if (!out.is_open()) {
        std::cerr << "Failed to open output.txt\n";
        return 1;
    }

    // Colors
    out << "let allColors: number[] = [";
    for (int i = 0; i < (int)globalColors.size(); i++) {
        out << globalColors[i];
        if (i + 1 < (int)globalColors.size()) out << ",";
    }
    out << "]\n\n";

    // PNGs
    for (int i = 0; i < (int)encodedPNGs.size(); i++) {
        auto& e = encodedPNGs[i];
        int w, h, ox, oy;
        std::string encoded;
        std::tie(w, h, ox, oy, encoded) = e;

        out << "let png" << i << " = ["
            << w << "," << h << "," << ox << "," << oy << ",\""
            << encoded << "\"]\n\n";
    }

    out.close();
    std::cout << "Wrote output.txt successfully.\n";
    return 0;
}
