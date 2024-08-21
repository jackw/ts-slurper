# ts-slurper

A PoC to understand how types can be shared across projects using an npm package and some automations

## How does it work?

This repo consists of a script that pulls code from various other repos and places it in directories within the src. It then creates a barrel file to export everything from these "other repo type files" and finally bundles the types into a single dist/index.d.ts file. This is then used as the NPM package types input for consuming projects. This will be wired up with a workflow which on success creates a release with the dist package attached which can be downloaded and installed using your favourite node package manager...

`npm install ./path/to/tarball.tgz`

## How do I add plugins to the package?

There is a [pluginsMetadata.json](./pluginMetadata.json) file in the root of this repo which contains the meta information for the script to create the package contents.

## How to publish releases

As a PoC this repo will only publish the packed package to gh releases. This is to make it easy to install from the tarball attached to a gh release.

To release a new version run `npm version <patch|minor|major>` and push with `git push origin main --follow-tags`.
