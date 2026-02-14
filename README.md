# PNG-to-MakeCode

A small C++ tool that converts PNG images into MakeCode-compatible data.  
Useful for MakeCode Arcade sprites, tiles, and icons.

## Features
- Loads PNG files using stb_image.h
- Trims transparent borders
- Builds a global color palette
- Encodes pixel data into a compact two-character format
- Outputs everything into output.txt

## How to Build
1. Install Visual Studio 2022 with the "Desktop development with C++" workload.
2. Clone this repository:
   git clone https://github.com/c-minusminus/png-to-makecode.git
3. Open pngToMakecode.sln in Visual Studio.
4. Build the solution (Build → Build Solution).

## How to Use
Run the program from Visual Studio or by double-clicking the compiled .exe.

The program will ask:

1. How many PNG files you want to process.
2. The file path for each PNG.

Example:

    How many PNG files do you want to process: 2
    Enter PNG file path #1: player.png
    Enter PNG file path #2: enemy.png

After processing, the program writes all results to:

    output.txt

## Example Output
    let allColors: number[] = [0,15721648]
    let png0 = [5,5,0,0,"ababababababaaabaaababababababaaabababaaabaaaaaaab"]

## MakeCode Instructions

1. Open your MakeCode project.
2. Open the file where your image data should go.
3. Copy everything from **other.txt** into your MakeCode project.
4. Replace the `allColors` array in MakeCode with the one from **output.txt**.
5. Replace each `pngX` entry (png0, png1, etc.) with the matching entries from **output.txt**.
6. In `namespace userconfig {}`, replace the placeholder `5`s with the actual width and height of your image.
7. Replace the last `3`s with a number that controls scaling:
   - Small images → use a larger number
   - Large images → use a smaller number
8. Run the MakeCode project. Your image should appear.
   (Large images may load slowly or may not work depending on MakeCode limits.)

## Project Structure
    main.cpp
    stb_image.h
    pngToMakecode.sln
    pngToMakecode.vcxproj
    .gitignore
    .gitattributes
    other.txt

## License
MIT License
