/** Wait for the closing drawer's history cleanup before opening the next dialog. */
export function afterPopupClose(action: () => void) {
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    window.removeEventListener("popstate", finish);
    window.clearTimeout(timer);
    // Other popup listeners must finish consuming this same popstate first.
    window.setTimeout(action, 0);
  };
  const timer = window.setTimeout(finish, 500);
  window.addEventListener("popstate", finish);
}
