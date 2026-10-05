import fs from "node:fs/promises";
import sharp from "sharp";
await fs.mkdir("public/images", { recursive: true });
await fs.mkdir("public/icons", { recursive: true });
const leaf = (x, y, r = 0) =>
  `<g transform="translate(${x} ${y}) rotate(${r})"><ellipse rx="24" ry="10" fill="#527751"/><path d="M-18 0H18" stroke="#aec28f" stroke-width="2"/></g>`;
const carrot = (x, y, r = 0) =>
  `<g transform="translate(${x} ${y}) rotate(${r})"><path d="M-20 -25Q-3 -40 19 -24L3 75Q0 87-5 74Z" fill="#cb783c"/><path d="M-11 -2L7 -5M-9 19L3 17M-5 40L0 38" stroke="#ae602f" stroke-width="3"/>${leaf(-7, -38, -55)}${leaf(9, -43, 55)}</g>`;
const tomato = (x, y, r = 30) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="#be6248"/><path d="M${x - 12} ${y - r + 6}l12 8 12-8-5 14 7 8-14-4-14 4 7-8Z" fill="#466c45"/><ellipse cx="${x - 10}" cy="${y - 8}" rx="5" ry="9" fill="#de9873" transform="rotate(25 ${x - 10} ${y - 8})"/>`;
const backgrounds = {
  stew: "#dfe5d5",
  vegetables: "#e6e8d7",
  soup: "#eaddc9",
  pasta: "#e9e0ca",
  fish: "#dce6df",
  salad: "#e0e8d4",
  bake: "#e8dbcb",
};
for (const [kind, bg] of Object.entries(backgrounds)) {
  let food = "";
  if (kind === "soup")
    food =
      '<circle cx="320" cy="221" r="123" fill="#bb702e"/><circle cx="320" cy="221" r="108" fill="#d39648"/><path d="M266 181Q340 145 378 217T278 266" fill="none" stroke="#f5e3ba" stroke-width="9" stroke-linecap="round"/>' +
      leaf(331, 214, 25) +
      leaf(311, 230, -25);
  if (kind === "pasta") {
    for (let i = 0; i < 22; i++) {
      const x = 225 + ((i * 43) % 185),
        y = 146 + ((i * 37) % 145);
      food += `<path d="M${x} ${y}q40 -20 52 10t-26 19" stroke="#dcb65b" stroke-width="11" fill="none" stroke-linecap="round"/><path d="M${x} ${y + 2}q25 25 42 8" stroke="#aa523d" stroke-width="4" fill="none"/>`;
    }
    food += leaf(332, 201, 10) + leaf(358, 222, 65);
  }
  if (kind === "stew") {
    for (let i = 0; i < 11; i++) {
      let x = 220 + ((i * 43) % 170),
        y = 145 + ((i * 31) % 133);
      food += `<rect x="${x}" y="${y}" width="48" height="40" rx="12" fill="${i % 2 ? "#a7764d" : "#b88959"}" transform="rotate(${i * 13} ${x + 24} ${y + 20})"/><path d="M${x + 9} ${y + 15}h22" stroke="#c9a270" stroke-width="3"/>`;
    }
    food += carrot(256, 224, 63) + leaf(359, 240, -25);
  }
  if (kind === "fish")
    food =
      '<ellipse cx="375" cy="251" rx="60" ry="48" fill="#e4d6a5"/><path d="M228 158Q285 130 364 174L346 258Q272 292 230 234Z" fill="#d69370"/><path d="M236 171L351 211M233 191L347 232M238 215L336 253" stroke="#f5c5a0" stroke-width="5"/>' +
      leaf(402, 177, 25) +
      leaf(412, 197, 70) +
      '<circle cx="377" cy="156" r="28" fill="#e2c15f"/><circle cx="377" cy="156" r="22" fill="#efd989"/><path d="M377 136v40M357 156h40M363 142l28 28" stroke="#fff1c2" stroke-width="2"/>';
  if (kind === "salad" || kind === "vegetables") {
    for (let i = 0; i < 17; i++) {
      const x = 234 + ((i * 41) % 176),
        y = 151 + ((i * 31) % 144);
      food += leaf(x, y, i * 37);
      if (i % 3 === 0) food += tomato(x + 12, y, 20);
      if (i % 4 === 0)
        food += `<rect x="${x}" y="${y}" width="21" height="18" rx="3" fill="#f4edcf" transform="rotate(20 ${x} ${y})"/>`;
    }
    if (kind === "vegetables") food += carrot(300, 226, 55);
  }
  if (kind === "bake")
    food =
      '<rect x="213" y="142" width="215" height="145" rx="16" fill="#a26939"/><rect x="219" y="148" width="203" height="132" rx="12" fill="#d7aa5b"/>' +
      Array.from(
        { length: 22 },
        (_, i) =>
          `<ellipse cx="${235 + ((i * 31) % 169)}" cy="${167 + ((i * 29) % 93)}" rx="${7 + (i % 7)}" ry="7" fill="${i % 3 ? "#edca7b" : "#ab7440"}"/>`,
      ).join("") +
      leaf(345, 220, 10);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420"><defs><filter id="shadow"><feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#535c3c" flood-opacity=".14"/></filter><pattern id="linen" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 0H8M0 0V8" stroke="#ffffff" stroke-opacity=".13"/></pattern></defs><rect width="640" height="420" fill="${bg}"/><rect width="640" height="420" fill="url(#linen)"/><path d="M520 0L590 420H640V0Z" fill="#f7f0dd" opacity=".75"/><path d="M539 0L609 420M561 0L631 420" stroke="#b9bf9e" stroke-width="2" opacity=".5"/><ellipse cx="320" cy="227" rx="180" ry="159" fill="#fffdf2" filter="url(#shadow)"/><ellipse cx="320" cy="219" rx="148" ry="135" fill="#f0ecdc"/><ellipse cx="320" cy="219" rx="144" ry="131" fill="#f9f6e9"/>${food}<path d="M101 120V308M85 116v54q16 25 32 0v-54M93 115v45M109 115v45" fill="none" stroke="#898e76" stroke-width="6" stroke-linecap="round"/><path d="M501 116q-28 45-10 82h10v109" fill="none" stroke="#898e76" stroke-width="7" stroke-linecap="round"/></svg>`;
  await fs.writeFile(`public/images/${kind}.svg`, svg);
}
const harvest = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 200"><ellipse cx="170" cy="170" rx="128" ry="14" fill="#c8cfb5" opacity=".45"/>${carrot(90, 104, -60)}${carrot(243, 102, 43)}<g transform="translate(163 115)"><ellipse rx="64" ry="49" fill="#b46d3e"/><ellipse rx="44" ry="49" fill="#cf8651"/><ellipse rx="23" ry="49" fill="#dc9c63"/><path d="M-4 -47q-2-20 14-22l3 10q-10 4-8 14" fill="#5b7050"/></g>${leaf(61, 149, 10)}${leaf(274, 156, -25)}${tomato(216, 147, 26)}<path d="M179 22q-11 10-6 25" stroke="#5d7551" stroke-width="3" fill="none"/>${leaf(158, 25, 40)}${leaf(188, 30, -45)}</svg>`;
await fs.writeFile("public/images/harvest.svg", harvest);
const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" rx="100" fill="#354d3e"/><circle cx="256" cy="256" r="144" fill="#f8f3df"/><circle cx="256" cy="256" r="110" fill="none" stroke="#c5cdb6" stroke-width="6"/><path d="M117 158v76m-20-76v52q20 35 40 0v-52m-20 77v119M397 160q-34 48-18 85h18v109" stroke="#f8f3df" stroke-width="12" fill="none" stroke-linecap="round"/><path d="M258 199v84m0 31v4" stroke="#a95337" stroke-width="15" stroke-linecap="round"/></svg>`;
for (const size of [192, 512])
  await sharp(Buffer.from(icon))
    .resize(size, size)
    .png()
    .toFile(`public/icons/icon-${size}.png`);
await sharp(Buffer.from(icon.replace('rx="100"', 'rx="0"')))
  .png()
  .toFile("public/icons/maskable-512.png");
console.log("Illustrations locales et icônes PWA générées.");
