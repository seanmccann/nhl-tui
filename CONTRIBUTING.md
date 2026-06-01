# Contributing

Thanks for contributing to `nhl-tui`.

## Before You Open A PR

Run:

```bash
pnpm check
pnpm build
```

## Project Structure

Keep the layering intact:

- `src/api`: endpoint access only
- `src/domain`: normalization, diffing, events, reducer logic
- `src/ui`: Ink rendering and input dispatch only

## Trademark And Content Guidance

Please do not add:

- NHL logos
- team logos
- league or club branding assets
- broadcast audio or video
- copyrighted media or artwork sourced from NHL properties

The UI should use team abbreviations and text-based presentation only.

## Design Constraints

- keep the UI terminal-native and keyboard-first
- prefer dense, stable layouts over web-style components
- avoid leaking raw upstream payloads into the UI layer
