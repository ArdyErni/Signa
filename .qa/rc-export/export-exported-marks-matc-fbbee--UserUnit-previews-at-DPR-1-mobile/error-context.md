# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: export.spec.ts >> exported marks match rotated, cropped and UserUnit previews at DPR 1
- Location: tests\browser\export.spec.ts:6:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Test source

```ts
  84  |               if (x >= 80 && x < (40 + asset.width) * 2 && y >= 120 && y < (60 + asset.height) * 2) continue;
  85  |               const j = (y * canvas.width + x) * 4;
  86  |               for (let c = 0; c < 4; c++) if (pixels[j + c] !== originalPage.pixels[j + c]) unchangedOutside = false;
  87  |             }
  88  |             let minX = Infinity,
  89  |               minY = Infinity,
  90  |               maxX = -1,
  91  |               maxY = -1;
  92  |             for (let y = 0; y < canvas.height; y++)
  93  |               for (let x = 0; x < canvas.width; x++) {
  94  |                 const j = (y * canvas.width + x) * 4;
  95  |                 if (
  96  |                   (pixels[j] > 200 &&
  97  |                     pixels[j + 1] < 50 &&
  98  |                     pixels[j + 2] < 50) ||
  99  |                   (pixels[j] < 50 && pixels[j + 1] < 50 && pixels[j + 2] > 200)
  100 |                 ) {
  101 |                   minX = Math.min(x, minX);
  102 |                   minY = Math.min(y, minY);
  103 |                   maxX = Math.max(x, maxX);
  104 |                   maxY = Math.max(y, maxY);
  105 |                 }
  106 |               }
  107 |             const sample = (x: number, y: number) => {
  108 |               const j =
  109 |                 (Math.round(y * 2) * canvas.width + Math.round(x * 2)) * 4;
  110 |               return Array.from(pixels.slice(j, j + 3));
  111 |             };
  112 |             checks.push({
  113 |               bounds: [minX, minY, maxX + 1, maxY + 1],
  114 |               red: sample(53, 73),
  115 |               blue: sample(90, 110),
  116 |               empty: sample(90, 73),
  117 |               dimensions:
  118 |                 output.pages[i].width === session.pages[i].width &&
  119 |                 output.pages[i].height === session.pages[i].height,
  120 |               geometry: p.rotate === originalPage.page.rotate && p.userUnit === originalPage.page.userUnit && JSON.stringify(p.view) === JSON.stringify(originalPage.page.view),
  121 |               content: JSON.stringify(originalText.items) === JSON.stringify(outputText.items),
  122 |               unchangedOutside,
  123 |               repeatOperators: firstOps.fnArray.length === secondOps.fnArray.length,
  124 |             });
  125 |           }
  126 |           const deleted = await exportPdf(
  127 |             session,
  128 |             [{ ...placements[0], x: 180 }],
  129 |             assets,
  130 |           );
  131 |           const moved = await loadPdf(
  132 |             new File([new Uint8Array(deleted)], "moved.pdf", {
  133 |               type: "application/pdf",
  134 |             }),
  135 |           );
  136 |           const movement = [];
  137 |           for (let i = 0; i < moved.pdf.numPages; i++) {
  138 |             const actual = await raster(moved, i), originalPage = await raster(session, i);
  139 |             let colored = 0, minX = Infinity, maxX = -1;
  140 |             for (let j = 0; j < actual.pixels.length; j += 4) {
  141 |               const r = actual.pixels[j], g = actual.pixels[j + 1], b = actual.pixels[j + 2];
  142 |               if ((r > 200 && g < 50 && b < 50) || (r < 50 && g < 50 && b > 200)) {
  143 |                 colored++;
  144 |                 const x = (j / 4) % actual.canvas.width;
  145 |                 minX = Math.min(minX, x); maxX = Math.max(maxX, x);
  146 |               }
  147 |             }
  148 |             movement.push({ colored, minX, maxX,
  149 |               originalOnly: actual.pixels.every((value: number, j: number) => value === originalPage.pixels[j]),
  150 |             });
  151 |           }
  152 |           const summary = {
  153 |             checks,
  154 |             originalUnchanged:
  155 |               JSON.stringify(original) ===
  156 |               JSON.stringify(Array.from(session.original)),
  157 |             pageCount: output.pdf.numPages,
  158 |             repeatLength: first.length === second.length,
  159 |             movedCount: moved.pdf.numPages,
  160 |             movement,
  161 |           };
  162 |           await output.pdf.destroy();
  163 |           await moved.pdf.destroy();
  164 |           await session.pdf.destroy();
  165 |           await firstOutput.pdf.destroy();
  166 |           return summary;
  167 |         },
  168 |         { source: Array.from(await fixture()) },
  169 |       );
  170 |       expect(result.originalUnchanged).toBe(true);
  171 |       expect(result.pageCount).toBe(4);
  172 |       expect(result.repeatLength).toBe(true);
  173 |       expect(result.movedCount).toBe(4);
  174 |       expect(result.movement[0].colored).toBeGreaterThan(0);
  175 |       expect(Math.abs(result.movement[0].minX - 376)).toBeLessThanOrEqual(4);
  176 |       expect(Math.abs(result.movement[0].maxX + 1 - 576)).toBeLessThanOrEqual(4);
  177 |       for (const removed of result.movement.slice(1)) {
  178 |         expect(removed.colored).toBe(0);
  179 |         expect(removed.originalOnly).toBe(true);
  180 |       }
  181 |       for (const check of result.checks) {
  182 |         expect(check.dimensions).toBe(true);
  183 |         expect(check.geometry).toBe(true);
> 184 |         expect(check.content).toBe(true);
      |                               ^ Error: expect(received).toBe(expected) // Object.is equality
  185 |         expect(check.unchangedOutside).toBe(true);
  186 |         expect(check.repeatOperators).toBe(true);
  187 |         check.bounds.forEach((value: number, i: number) =>
  188 |           expect(Math.abs(value - [96, 136, 296, 236][i])).toBeLessThanOrEqual(
  189 |             4,
  190 |           ),
  191 |         );
  192 |         expect(check.red).toEqual([255, 0, 0]);
  193 |         expect(check.blue).toEqual([0, 0, 255]);
  194 |         expect(check.empty).toEqual([255, 255, 255]);
  195 |       }
  196 |     } finally {
  197 |       await context.close();
  198 |     }
  199 |   });
  200 | 
```