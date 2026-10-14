# Extracting the UI kit into a shared package

Optional pattern. Apply it only when a second app needs the same kit.

## Concept

A single app has no consumer to version, so its UI kit stays in the app. A lint rule limits the kit's own imports to shared utilities; screens import from the kit's index by convention. When several apps built from the template should share one look, move tokens and components into a workspace package and depend on it from each app.

## Example

1. Make the repository a bun workspace (`workspaces` in the root manifest) and move the kit and its token stylesheet into a package with an `exports` map that exposes the index and the stylesheet.
2. List `react`, `react-native` and the native modules the kit uses as `peerDependencies`, so each app keeps a single copy.
3. In each app, import the package stylesheet from the global stylesheet and tell the styling engine to scan the package for class names. UNVERIFIED: the Tailwind v4 `@source` directive is the usual mechanism, and whether Uniwind needs more at your version.
4. Let Metro watch the package folder. Expo's Metro config detects workspaces automatically. UNVERIFIED: confirm at your SDK version.
5. Keep the lint rule that limits the kit's own imports to shared utilities. Apps import only the package index by convention; the `exports` map exposes nothing else.

```json
{
  "name": "@acme/ui",
  "exports": { ".": "./index.ts", "./styles.css": "./styles.css" },
  "peerDependencies": { "react": "*", "react-native": "*" }
}
```

## Limitations

- Every change now needs a version or a workspace link, and tests need Jest to transform the package's TypeScript.
- A second copy of React or a native module in `node_modules` breaks hooks or native registration at runtime.
- Symlinked packages can confuse Metro's resolution cache; clear it after moving files.
- Apps that diverge in design will fight the shared tokens.

## Scope

- Fits: two or more apps that should look the same and are released together.
- Does not fit: one app, or apps that only share a few components (copy them instead).
