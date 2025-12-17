export function layout({ title, head = "", nav = "", pills = "", content = "", scripts = "" }) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <link rel="stylesheet" href="/public/shared/app.css" />
  ${head}
</head>
<body>
  <div class="wrap">
    ${nav}
    ${pills ? `<div class="pillrow">${pills}</div>` : ""}
    ${content}
  </div>
  ${scripts}
</body>
</html>`;
}
