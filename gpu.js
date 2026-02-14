namespace userconfig {
    export const ARCADE_SCREEN_WIDTH = 5 * 3 * 3
    export const ARCADE_SCREEN_HEIGHT = 5 * 3 * 3
}

let allColors: number[] = [0, 15721648]
let png0 = [5, 5, 0, 0, "ababababababaaabaaababababababaaabababaaabaaaaaaab"]
const CHARSET =
    "abcdefghijklmnopqrstuvwxyz" +
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
    "0123456789" +
    "!@#$%^&*()-_=+[]{};:,.?"
//abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+[]{};:,.?

class GPU {
    VW: number
    VH: number
    fb: number[][][]
    colors3x3: number[][]
    VPScale = 3

    constructor(scale: number) {
        this.VW = userconfig.ARCADE_SCREEN_WIDTH / 3
        this.VH = userconfig.ARCADE_SCREEN_HEIGHT / 3
        this.VPScale = scale

        this.clear()
    }

    colorsToTile(colors: number[]): Image {
        let img = image.create(3, 3)
        for (let x = 0; x < 3; x++)
            for (let y = 0; y < 3; y++)
                img.setPixel(x, y, colors[x + y * 3])
        return img
    }

    clear() {
        this.fb = []
        for (let x = 0; x < this.VW; x++) {
            this.fb[x] = []
            for (let y = 0; y < this.VH; y++) {
                this.fb[x][y] = [0, 0, 0, 0, 0, 0, 0, 0, 0]
            }
        }
    }

    render() {
        for (let x = 0; x < this.VW; x++) {
            for (let y = 0; y < this.VH; y++) {
                const cols = this.fb[x][y]
                const tile = this.colorsToTile(cols)
                screen.drawImage(tile, x * 3, y * 3)
            }
        }
    }

    shuffle() {
        for (let x = 0; x < this.fb.length; x++) {
            for (let y = 0; y < this.fb[x].length; y++) {
                this.shuffleTile(this.fb[x][y])
            }
        }
    }
    shuffleTile(colors: number[]) {
        for (let i = colors.length - 1; i > 0; i--) {
            const j = Math.randomRange(0, i)
            const t = colors[i]
            colors[i] = colors[j]
            colors[j] = t
        }
        return colors;
    }

    setPixel(x: number, y: number, c: number[]) {
        x = Math.floor(x) * this.VPScale
        y = Math.floor(y) * this.VPScale

        if (x < 0 || x >= this.VW || y < 0 || y >= this.VH) {
            return
        }

        for (let X = 0; X < this.VPScale; X++) {
            for (let Y = 0; Y < this.VPScale; Y++) {
                this.fb[x + X][y + Y] = this.shuffleTile(c.slice())
            }
        }
    }
    drawImage(img: number[][][], x: number, y: number) {
        for (let px = 0; px < img.length; px++) {
            for (let py = 0; py < img[px].length; py++) {
                this.setPixel(x + px, y + py, img[px][py])
            }
        }
    }
    drawOpaqueImage(img: number[][][], x: number, y: number) {
        for (let px = 0; px < img.length; px++) {
            for (let py = 0; py < img[px].length; py++) {
                let b: boolean = true
                for (let i = 0; i < img[px][py].length; i++) {
                    if (img[px][py][i] == 0) b = false
                }
                if (b) {
                    //console.log(img[px][py])
                    this.setPixel(x + px, y + py, img[px][py])
                }
            }
        }
    }

}

const gpu = new GPU(3)

function scaleImage(src: number[][][], scale: number = gpu.VPScale): number[][][] {
    const w = src.length
    const h = src[0].length

    const W = w * scale
    const H = h * scale

    // create empty scaled image
    const out: number[][][] = []
    for (let x = 0; x < W; x++) {
        out[x] = []
        for (let y = 0; y < H; y++) {
            out[x][y] = [0, 0, 0, 0, 0, 0, 0, 0, 0]
        }
    }

    // fill scaled image
    for (let x = 0; x < w; x++) {
        for (let y = 0; y < h; y++) {

            const tile = src[x][y]

            for (let dx = 0; dx < scale; dx++) {
                for (let dy = 0; dy < scale; dy++) {

                    out[x * scale + dx][y * scale + dy] = tile.slice()
                }
            }
        }
    }

    return out
}

function rgbToNumberArr(r: number, g: number, b: number): number[] {
    // --- tiny hex converter (MakeCode-safe) ---
    function toHexByte(n: number): string {
        const hex = "0123456789ABCDEF"
        n = Math.max(0, Math.min(255, Math.round(n)))
        return hex.charAt((n >> 4) & 0xF) + hex.charAt(n & 0xF)
    }

    // --- decode "Rxx" / "Gxx" / "Bxx" ---
    function decode(code: string) {
        let c = code.charAt(0)
        let v = parseInt(code.substr(1), 16)
        if (c === "R") return { r: v, g: 0, b: 0 }
        if (c === "G") return { r: 0, g: v, b: 0 }
        return { r: 0, g: 0, b: v }
    }

    // --- closest palette index ---
    function closest(r: number, g: number, b: number): number {
        let pal = palette.getCurrentColors()
        let best = 0
        let bestDist = 999999

        for (let i = 0; i < 16; i++) {
            let col = pal.color(i)
            let pr = (col >> 16) & 0xFF
            let pg = (col >> 8) & 0xFF
            let pb = col & 0xFF

            let dr = pr - r
            let dg = pg - g
            let db = pb - b
            let dist = dr * dr + dg * dg + db * db

            if (dist < bestDist) {
                bestDist = dist
                best = i
            }
        }
        return best
    }

    // --- generate 9‑pixel channel pattern ---
    let R = r, G = g, B = b
    let pattern: string[] = []

    for (let i = 0; i < 9; i++) {

        let channel = "R"
        let value = R

        // pick the channel with the largest remaining intensity
        if (G >= R && G >= B) {
            channel = "G"
            value = G
        } else if (B >= R && B >= G) {
            channel = "B"
            value = B
        } else {
            channel = "R"
            value = R
        }


        pattern.push(channel + toHexByte(value))

        if (channel === "R") R -= r / 9
        if (channel === "G") G -= g / 9
        if (channel === "B") B -= b / 9
    }

    // --- convert channel pattern → palette indices ---
    let out: number[] = []
    for (let i = 0; i < 9; i++) {
        let px = decode(pattern[i])
        out.push(closest(px.r, px.g, px.b))
    }

    return out
}
class PNGData {
    constructor(w: number, h: number, x: number, y: number, data: string) {
        this.w = w
        this.h = h
        this.x = x
        this.y = y
        this.data = data
    }
    w: number    // width
    h: number    // height
    x: number    // offsetX
    y: number    // offsetY
    data: string // pixel data
}

let IMG: number[][][] = [] // pngIndex pixelX pixelY paletteIndex | x y c

function loadPNG(PNG: (string | number)[]) {
    let pngData: PNGData = new PNGData(PNG[0] as number, PNG[1] as number, PNG[2] as number, PNG[3] as number, PNG[4] as string)

    gpu.colors3x3 = []
    for (let i = 0; i < allColors.length; i++) {
        gpu.colors3x3[i] = rgbToNumberArr(
            (allColors[i] >> 16) & 0xFF,
            (allColors[i] >> 8) & 0xFF,
            (allColors[i]) & 0xFF)
    }
    
        
    IMG = []

    // data string -> number[][][]
    for (let x = 0; x < pngData.w; x++) {
        IMG[x] = []
        for (let y = 0; y < pngData.h; y++) {
            const data = pngData.data
            const j = y * pngData.w + x

            let colorIndex = CHARSET.indexOf(data.charAt(j * 2)) * CHARSET.length +
                CHARSET.indexOf(data.charAt(j * 2 + 1))

            const ci = (colorIndex >= 0 && colorIndex < gpu.colors3x3.length) ? colorIndex : 0
            IMG[x][y] = gpu.colors3x3[ci].slice()

        }
    }

    // 1. Pad TOP
    for (let y = 0; y < pngData.y; y++) {
        for (let x = 0; x < IMG.length; x++) {
            IMG[x].unshift([0, 0, 0, 0, 0, 0, 0, 0, 0])
        }
    }

    // 2. Pad BOTTOM
    while (IMG[0].length < 32) {
        for (let x = 0; x < IMG.length; x++) {
            IMG[x].push([0, 0, 0, 0, 0, 0, 0, 0, 0])
        }
    }

    // 3. Pad LEFT
    for (let x = 0; x < pngData.x; x++) {
        const col: number[][] = []
        for (let y = 0; y < 32; y++) {
            col.push([0, 0, 0, 0, 0, 0, 0, 0, 0])
        }
        IMG.unshift(col)
    }

    // 4. Pad RIGHT
    while (IMG.length < 32) {
        const col: number[][] = []
        for (let y = 0; y < 32; y++) {
            col.push([0, 0, 0, 0, 0, 0, 0, 0, 0])
        }
        IMG.push(col)
    }

}

loadPNG(png0)
gpu.fb = scaleImage(IMG, gpu.VPScale)
gpu.shuffle()
game.onPaint(function onPaint() {
    gpu.render()
    gpu.shuffle()
})
