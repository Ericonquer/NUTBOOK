// Windows path → scoped HTTP URL contract (W02 / W03).
//
// This test extracts the REAL production functions from dist/index.html and runs
// them with Windows path shapes that the macOS host cannot exercise through the
// UI. It is a regression tripwire for the frontend identity layer only; it is
// NOT evidence that the packaged Windows build resolves images, because the
// backend contract (canonical `\\?\` roots) and native I/O still need a Windows
// run. See docs/handoffs/active/windows-adaptation.md.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const indexHtml = readFileSync("dist/index.html", "utf8");

const IDENTITY_START = "// >>> windows-path-identity";
const IDENTITY_END = "// <<< windows-path-identity";

function sliceBetween(source, start, end) {
  const startIndex = source.indexOf(start);
  assert.ok(startIndex >= 0, `missing marker ${start}`);
  const endIndex = source.indexOf(end, startIndex);
  assert.ok(endIndex > startIndex, `missing marker ${end}`);
  return source.slice(startIndex, endIndex + end.length);
}

const identityBlock = sliceBetween(indexHtml, IDENTITY_START, IDENTITY_END);

const markdownRegionStart = indexHtml.indexOf("function isExternalHttpUrl(value) {");
const markdownRegionEnd = indexHtml.indexOf("function markdownImageAlignmentFromTitle");
assert.ok(markdownRegionStart >= 0 && markdownRegionEnd > markdownRegionStart, "markdown path region must exist");
const markdownRegion = indexHtml.slice(markdownRegionStart, markdownRegionEnd);

const markdownApi = new Function("appState",
  `${identityBlock}\n${markdownRegion}\nreturn { markdownImageFilePath, resolveMarkdownImageUrl, toScopedResourceUrl, normalizeLinkedFilePath };`
)({ isTauri: false });

const thumbnailRegionStart = indexHtml.indexOf("function toCacheResourceUrl(localPath) {");
const thumbnailRegionEnd = indexHtml.indexOf("function normalizeThumbnailBackendStatus");
assert.ok(thumbnailRegionStart >= 0 && thumbnailRegionEnd > thumbnailRegionStart, "thumbnail path region must exist");
const thumbnailRegion = indexHtml.slice(thumbnailRegionStart, thumbnailRegionEnd);

function loadThumbnailApi(appState) {
  return new Function(
    "appState",
    `${identityBlock}\n${thumbnailRegion}\nreturn { toCacheResourceUrl, normalizeThumbnailInfo };`
  )(appState);
}

const POSIX = {
  resourceOrigin: "http://127.0.0.1:41001",
  resourceRoot: "/library",
  resourceBaseDir: "/library/docs"
};

const WIN = {
  resourceOrigin: "http://127.0.0.1:41002",
  resourceRoot: "\\\\?\\C:\\Users\\demo\\文档",
  resourceBaseDir: "\\\\?\\C:\\Users\\demo\\文档"
};

const UNC = {
  resourceOrigin: "http://127.0.0.1:41003",
  resourceRoot: "\\\\?\\UNC\\server\\share\\docs",
  resourceBaseDir: "\\\\?\\UNC\\server\\share\\docs"
};

const tab = (preview) => ({ preview: { ...preview, fileType: "markdown" } });

// --- POSIX control group: current macOS behaviour must not regress -----------
{
  const posixTab = tab(POSIX);
  const resolved = markdownApi.markdownImageFilePath("assets/icon.png", posixTab);
  assert.equal(resolved, "/library/docs/assets/icon.png", "POSIX relative image must keep resolving to an absolute path");
  assert.equal(
    markdownApi.resolveMarkdownImageUrl("assets/icon.png", posixTab),
    "http://127.0.0.1:41001/docs/assets/icon.png"
  );
  assert.equal(
    markdownApi.resolveMarkdownImageUrl("../assets/icon.png", tab({ ...POSIX, resourceBaseDir: "/library/docs/sub" })),
    "http://127.0.0.1:41001/docs/assets/icon.png",
    "POSIX parent segments inside the root must still resolve"
  );
  assert.equal(
    markdownApi.toScopedResourceUrl("/library2/leak.png", posixTab),
    "",
    "POSIX sibling prefix must not be treated as inside the root"
  );
  assert.equal(
    markdownApi.toScopedResourceUrl("/Library/icon.png", posixTab),
    "",
    "POSIX comparison stays case sensitive"
  );
}

// --- Windows drive paths (canonical `\\?\` root) ----------------------------
{
  const winTab = tab(WIN);
  const resolved = markdownApi.markdownImageFilePath("assets/图片 1.png", winTab);
  assert.equal(resolved, "C:/Users/demo/文档/assets/图片 1.png", "relative image under a canonical Windows root must produce a Windows identity");
  assert.equal(
    markdownApi.resolveMarkdownImageUrl("assets/图片 1.png", winTab),
    "http://127.0.0.1:41002/assets/%E5%9B%BE%E7%89%87%201.png",
    "Windows relative image must map onto the scoped origin (W02)"
  );
  assert.equal(
    markdownApi.resolveMarkdownImageUrl("C:\\Users\\demo\\文档\\assets\\a.png", winTab),
    "http://127.0.0.1:41002/assets/a.png",
    "backslash absolute image path must map onto the scoped origin"
  );
  assert.equal(
    markdownApi.resolveMarkdownImageUrl("C:/Users/demo/文档/assets/a.png", winTab),
    "http://127.0.0.1:41002/assets/a.png",
    "forward-slash absolute image path must map onto the scoped origin"
  );
  assert.equal(
    markdownApi.resolveMarkdownImageUrl("\\\\?\\C:\\Users\\demo\\文档\\assets\\a.png", winTab),
    "http://127.0.0.1:41002/assets/a.png",
    "verbatim image path must map onto the scoped origin"
  );
  assert.equal(
    markdownApi.resolveMarkdownImageUrl("file:///C:/Users/demo/文档/assets/a.png", winTab),
    "http://127.0.0.1:41002/assets/a.png",
    "file URL image path must map onto the scoped origin"
  );
  assert.equal(
    markdownApi.toScopedResourceUrl("C:/Users/demo/文档2/leak.png", winTab),
    "",
    "Windows sibling directory with a shared string prefix must not be inside the root"
  );
  assert.equal(
    markdownApi.toScopedResourceUrl("C:\\Users\\demo\\文档\\..\\secret.png", winTab),
    "",
    "Windows lexical escape above the root must be rejected"
  );
  assert.equal(
    markdownApi.toScopedResourceUrl("C:\\Users\\demo\\文档\\sub\\..\\a.png", winTab),
    "http://127.0.0.1:41002/a.png",
    "Windows lexical resolution that stays inside the root must still work"
  );
  assert.equal(
    markdownApi.toScopedResourceUrl("D:\\Users\\demo\\文档\\a.png", winTab),
    "",
    "a different drive letter is a different root"
  );
  assert.equal(
    markdownApi.toScopedResourceUrl("C:/Users/other/文档/a.png", winTab),
    "",
    "a different directory chain is outside the root"
  );
}

// --- Drive-root root (single file added straight from a drive root) ---------
{
  const driveRoot = { resourceOrigin: "http://127.0.0.1:41004", resourceRoot: "\\\\?\\C:\\", resourceBaseDir: "\\\\?\\C:\\" };
  assert.equal(
    markdownApi.resolveMarkdownImageUrl("assets/a.png", tab(driveRoot)),
    "http://127.0.0.1:41004/assets/a.png",
    "a root at the drive root must still map images instead of failing closed on an empty root"
  );
  assert.equal(
    markdownApi.toScopedResourceUrl("D:\\a.png", tab(driveRoot)),
    "",
    "a different drive must still be outside a drive-root scoped server"
  );
}

// --- Drive/data volume head is case insensitive, the path body is not ------
{
  const mixedRoot = { ...WIN, resourceRoot: "\\\\?\\C:\\Users\\Demo\\文档", resourceBaseDir: "\\\\?\\C:\\Users\\Demo\\文档" };
  assert.equal(
    markdownApi.toScopedResourceUrl("c:\\Users\\Demo\\文档\\Assets\\A.PNG", tab(mixedRoot)),
    "http://127.0.0.1:41002/Assets/A.PNG",
    "a drive-letter case difference is the same volume and must still match"
  );
  assert.equal(
    markdownApi.toScopedResourceUrl("C:\\Users\\demo\\文档\\a.png", tab(mixedRoot)),
    "",
    "a directory case difference must fail closed instead of redirecting to a different file (W02-R2)"
  );
  const aliasRoot = { ...WIN, resourceRoot: "\\\\?\\C:\\docs\\Allowed", resourceBaseDir: "\\\\?\\C:\\docs\\Allowed" };
  assert.equal(
    markdownApi.toScopedResourceUrl("C:\\docs\\allowed\\other.png", tab(aliasRoot)),
    "",
    "a case-sensitive sibling directory must never be remapped onto the authorized root (W02-R2)"
  );
  assert.equal(
    markdownApi.toScopedResourceUrl("C:\\docs\\Allowed\\other.png", tab(aliasRoot)),
    "http://127.0.0.1:41002/other.png",
    "the exact-case path under the root must still map"
  );
}

// --- Markdown URI reference round trip (W02-R1) ----------------------------
// The backend writes `./assets/<encoded name>`. A `#` must never be read as a
// fragment delimiter, and a literal `%23` must never be decoded twice.
{
  const winTab = tab(WIN);
  const names = ["report#1.png", "report%23.png", "report one.png", "100%.png", "中文#1.png"];
  for (const name of names) {
    const encoded = encodeURIComponent(name);
    assert.equal(
      markdownApi.markdownImageFilePath(`./assets/${encoded}`, winTab),
      `C:/Users/demo/文档/assets/${name}`,
      `${name}: the reference must decode exactly once into the real OS file name`
    );
    assert.equal(
      markdownApi.resolveMarkdownImageUrl(`./assets/${encoded}`, winTab),
      `http://127.0.0.1:41002/assets/${encoded}`,
      `${name}: an encoded reference must resolve back to the same encoded URL`
    );
  }
  assert.equal(
    markdownApi.resolveMarkdownImageUrl("assets/report%2523.png", winTab),
    "http://127.0.0.1:41002/assets/report%2523.png",
    "a literal %23 in the file name must not be decoded twice into a fragment"
  );
}

// --- UNC shares ------------------------------------------------------------
{
  const uncTab = tab(UNC);
  assert.equal(
    markdownApi.markdownImageFilePath("assets/a.png", uncTab),
    "//server/share/docs/assets/a.png"
  );
  assert.equal(
    markdownApi.toScopedResourceUrl("\\\\server\\share\\docs\\a.png", uncTab),
    "http://127.0.0.1:41003/a.png",
    "plain UNC target must match a verbatim UNC root"
  );
  assert.equal(
    markdownApi.toScopedResourceUrl("\\\\server\\other\\docs\\a.png", uncTab),
    "",
    "a different UNC share is outside the root"
  );
  assert.equal(
    markdownApi.toScopedResourceUrl("/server/share/docs/a.png", tab(WIN)),
    "",
    "a POSIX path must not be coerced onto a Windows root"
  );
}

// --- Reserved characters must round-trip through the scoped URL -------------
{
  const winTab = tab(WIN);
  assert.equal(
    markdownApi.resolveMarkdownImageUrl("assets/%E6%8A%A5%E5%91%8A%20%231%20100%25.png", winTab),
    "http://127.0.0.1:41002/assets/%E6%8A%A5%E5%91%8A%20%231%20100%25.png",
    "space, # and % in a Windows file name must survive one encode/decode round trip"
  );
  assert.equal(
    markdownApi.resolveMarkdownImageUrl("assets/50%25%20done.png", winTab),
    "http://127.0.0.1:41002/assets/50%25%20done.png",
    "a literal percent in the file name must not be double encoded"
  );
}

// --- Cache thumbnails (W03) -------------------------------------------------
{
  const root = "\\\\?\\C:\\Users\\demo\\AppData\\Roaming\\com.nutbook.app\\.cache\\thumbnails";
  const appState = {
    cacheResourceOrigin: "http://127.0.0.1:42001",
    cacheResourceRoot: root
  };
  const { toCacheResourceUrl, normalizeThumbnailInfo } = loadThumbnailApi(appState);
  assert.equal(
    toCacheResourceUrl(`${root}\\ab\\cd.svg`),
    "http://127.0.0.1:42001/ab/cd.svg",
    "Windows thumbnail cache path must map onto the cache origin (W03)"
  );
  assert.equal(
    toCacheResourceUrl("\\\\?\\C:\\Users\\demo\\AppData\\Roaming\\com.nutbook.app\\.cache\\thumbnails2\\x.svg"),
    "",
    "cache sibling directory must not be inside the cache root"
  );
  const info = normalizeThumbnailInfo({
    status: "ready",
    path: `${root}\\ab\\cd.svg`,
    width: 1280,
    height: 720
  });
  assert.equal(info.path, "http://127.0.0.1:42001/ab/cd.svg");
  const outside = normalizeThumbnailInfo({ status: "ready", path: "C:\\Users\\demo\\elsewhere\\cover.svg" });
  assert.equal(
    outside.path,
    "C:\\Users\\demo\\elsewhere\\cover.svg",
    "an out-of-root cache path must stay unusable instead of being rewritten"
  );
  const posixAppState = { cacheResourceOrigin: "http://127.0.0.1:42002", cacheResourceRoot: "/tmp/cache/thumbnails" };
  const posixApi = loadThumbnailApi(posixAppState);
  assert.equal(
    posixApi.toCacheResourceUrl("/tmp/cache/thumbnails/ab/cd.svg"),
    "http://127.0.0.1:42002/ab/cd.svg",
    "POSIX thumbnail mapping must keep working"
  );
}

console.log("Windows path and scoped URL contract checks passed");
