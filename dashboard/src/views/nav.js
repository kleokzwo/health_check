function link(href, label, active) {
  return `<a class="${active ? "active" : ""}" href="${href}">${label}</a>`;
}

export function mainNav({ active = "health", user = null }) {
  const walletHref = user ? "/wallet" : "/wallet/login";
  return `
  <div class="nav">
    <div class="brand">
      <div class="logo"></div>
      <div class="title">
        <b>BitcoinII</b>
        <span class="mono">${user ? `User: ${user.username}` : "Health • Explorer • Wallet"}</span>
      </div>
    </div>

    <div class="navlinks">
      ${link("/", "Health", active === "health")}
      ${link("/explorer", "Explorer", active === "explorer")}
      ${link(walletHref, "Wallet", active === "wallet")}
    </div>

    <div class="pillrow">
      ${user ? `<div class="pill"><a class="mono" href="/wallet/logout" style="text-decoration:none;">Logout</a></div>` : ""}
    </div>
  </div>`;
}
