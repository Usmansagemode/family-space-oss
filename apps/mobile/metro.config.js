// https://docs.expo.dev/guides/monorepos/
const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')
const path = require('path')

const projectRoot = __dirname
const monorepoRoot = path.resolve(projectRoot, '../..')

let config = getDefaultConfig(projectRoot)

// Watch the monorepo root so Metro sees changes in packages/*
config.watchFolders = [monorepoRoot]

// Let Metro resolve packages from the monorepo root node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
]

// Metro needs to transpile .ts files from workspace packages
config.resolver.sourceExts = [
  ...config.resolver.sourceExts,
  'ts',
  'tsx',
]

module.exports = withNativeWind(config, { input: './global.css' })
