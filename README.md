<p align="center"><img src="https://cdn.jsdelivr.net/gh/keindev/mst-tools/media/banner.svg" alt="Package logo"></p>

<p align="center">
    <a href="https://travis-ci.com/keindev/mst-tools"><img src="https://travis-ci.com/keindev/mst-tools.svg?branch=master" alt="Build Status"></a>
    <a href="https://codecov.io/gh/keindev/mst-tools"><img src="https://codecov.io/gh/keindev/mst-tools/branch/master/graph/badge.svg" /></a>
    <a href="https://www.npmjs.com/package/mst-tools"><img alt="npm" src="https://img.shields.io/npm/v/mst-tools.svg"></a>
    <a href="https://github.com/tagproject/ts-package-shared-config"><img src="https://img.shields.io/badge/standard--shared--config-nodejs%2Bts-green?logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAfCAYAAACh+E5kAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAJQSURBVHgB1VftUcMwDFU4/tMNyAZ0A7IBbBA2CExAmIBjApcJChO0TFA2SJkgMIGRyDNV3TSt26RN353OX/LHUyTZIdoB1tqMZcaS0imBDzxkeWaJWR51SX0HrJ6pdsJyifpdb4loq3v9A+1CaBuWMR0Q502DzuJRFD34Y9z3DXIRNy/QPWKZY27COlM6BtZZHWMJ3CkVa28KZMTJkDpCVLOhs/oL2gMuEhYpxeenPPah9EdczLkvpwZgnQHWnlNLiNQGYiWx5gu6Ehz4m+WNN/2i9Yd75CJmeRDXogbIFxECrqQ2wIvlLBOXaViuYbGQNSQLFSGZyOnulb2wadaGnyoSSeC8GBJkNDf5kloESAhy2gFIIPG2+ufUMtivn/gAEi+Gy4u6FLxh/qer8/xbLq7QlNh6X4mbtr+A3pylDI0Lb43YrmLmXP5v3a4I4ABDRSI4xjB/ghveoj4BCVm37JQADhGDgOA+YJ48TSaoOwKpt27aOQG1WRES3La65WPU3dysTjE8de0Aj8SsKS5sdS9lqCeYI08bU6d8EALYS5OoDW4c3qi2gf7f+4yODfj2DIcqdVzYKnMtEUO7RP2gT/W1AImxXSC3i7R7rfRuMT5G2xzSYzaCDzOyyzDeuNHZx1a3fOdJJwh28fRwwT1QY6Xzf7TvWG6ob/BIGPQ59ymUngRyRn2El6Fy5T7G0zl+JmoC3KRQXyT1xpfiJKIeAemzqBl6U3V5ocZNf4hHg61u223wn4nOqF8IzvF9IxCMkyfQ+i/lnnhlmW6h9+Mqv1SmQhehji4JAAAAAElFTkSuQmCC" alt="Standard Shared Config"></a>
</p>

Toolset for efficient development with MobX-State-Tree

## Install

```
npm install mobx mobx-state-tree mst-tools
```

## Usage

> For a detailed description of all helper functions and wrappers see [API](##API)

```typescript
import { types, effect } from "mst-tools"

const model = types.model('ModelName', {
    ...,
    isLoaded: types.flag,
    isLoading: types.flag,
  })
  .effects((self, { isLoading, isLoaded }) => ({
    load: effect(
      function* () {
        self.field = yield self.api.load();
      },
      { isLoading, isLoaded }
    ),
  }));

const store = model.create({});

await store.load();
```

## Benchmark

The toolkit adds additional code to implement new features. Welcome - if you are willing to pay for the speed of development with the speed of work.

```console
npm run benchmark

---

Test perf (model creation):
[mobx-state-tree] x 7,843 ops/sec ±0.28% (92 runs sampled)
[mst-tools] x 7,141 ops/sec ±0.31% (93 runs sampled)
# Fastest is [mobx-state-tree]

---

OS: Ubuntu 21.10 x86_64
DE: GNOME 40.5
Terminal: tilix
CPU: Intel i9-9900 (16) @ 5.000GHz
GPU: NVIDIA GeForce RTX 2070
Memory: 32019MiB

```

## API

Click the tools names for complete docs.

...in process
