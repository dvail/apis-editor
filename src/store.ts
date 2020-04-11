import create, { GetState } from 'zustand'
import produce from 'immer'
import uuidv4 from 'uuid/v4'
import { ColorResult } from 'react-color'
import flow from 'lodash/fp/flow'
import keys from 'lodash/fp/keys'
import max from 'lodash/fp/max'
import map from 'lodash/fp/map'

export type TileMap = {
  [key: string]: TileCoords & TileData
}

export interface TileCoords {
  q: number
  r: number
}

export interface TileOptions {
  fillColor: number
  fillAlpha: number
  strokeColor?: number
  strokeAlpha?: number
  tileImage?: string
}

// TODO These interfaces need to be defined more robustly (altitude should probably not be optional)
export interface TileData {
  altitude: number
  opts: TileOptions
}

export interface TileRegion {
  x: number, y: number, w: number, h: number
}

export interface TileSet {
  meta: {
    imageFileName?: string,
    atlasFileName?: string,
  }
  image: string // A base64 encoding of a tileset image
  atlas: {
    [name: string]: TileRegion
  }
}

export interface MapData {
  id: string
  name: string
  tiles: TileMap
  tileSets?: {
    [id: number]: TileSet
  }
}

export enum Widget {
  TileBuilder,
  SavedMapPane,
  TileSetPane,
  ColorPicker
}

export interface Store {
  getAll: GetState<Store>
  rotation: number
  viewAngle: number
  mapData: MapData
  openWidget?: Widget
  dockDrawerOpen: boolean

  selectedTileImage: string
  selectedTileColor: {
    r: number, b: number, g: number
  }

  increaseAngle(): void
  decreaseAngle(): void
  rotateClock(): void
  rotateCounter(): void

  addMapTileSet(tileSet: TileSet): void

  removeTile(tile: TileCoords): void
  updateTile(tile: TileCoords & Partial<TileData>): void

  mapLoad(payload: MapData): void
  setRotation(rotation: number): void
  setSelectedTileColor(color: ColorResult): void
  setSelectedTileImage(imageName: string): void
  toggleWidget(widgetType: Widget): void
  setMapName(name: string): void
}

// TODO Maybe move this stuff out of here?
export type RotationInterval = 0 | 30 | 60 | 90 | 120 | 150 | 180 | 210 | 240 | 270 | 300 | 330
export const RotationIncrement = 360 / 12
export const AngleIncrement = 0.05
export const tileKey = (q: number, r: number) => [q, r].toString()

export const [useStore] = create<Store>((set, get) => ({
  getAll: get,
  rotation: 0,
  viewAngle: 0.65,
  mapData: {
    id: uuidv4(),
    name: 'New Map',
    tiles: {},
    tileSets: {},
  },

  openWidget: null,
  dockDrawerOpen: false,

  selectedTileImage: null,
  selectedTileColor: { r: 187, g: 128, b: 68 },

  rotateClock: () => {
    let { rotation } = get()
    rotation += RotationIncrement
    rotation %= 360
    set({ rotation })
  },
  rotateCounter: () => {
    let { rotation } = get()
    rotation -= RotationIncrement
    rotation += 360 // Don't rotate below 0 degrees
    rotation %= 360
    set({ rotation })
  },
  increaseAngle: () => {
    set({ viewAngle: Math.min(get().viewAngle + 0.05, 1.0) })
  },
  decreaseAngle: () => {
    set({ viewAngle: Math.max(get().viewAngle - 0.05, 0.0) })
  },
  toggleWidget: (widget: Widget) => {
    if (get().openWidget === widget) {
      set({ openWidget: null })
    } else {
      set({ openWidget: widget })
    }
  },
  mapLoad: (payload: MapData) => {
    let mapData = produce(get().mapData, (next: MapData) => {
      next.tileSets = payload.tileSets ?? {}
      next.tiles = payload.tiles
      next.name = payload.name ?? next.name
      next.id = payload.id ?? next.id
    })

    set({ mapData })
  },

  addMapTileSet: (tileSet: TileSet) => {
    let mapData = produce(get().mapData, (next: MapData) => {
      // TODO Handle undefined here more gracefully
      let highestId = flow(
        keys,
        map(Number),
        max,
      )(next.tileSets)

      let nextId = highestId ? highestId + 1 : 1

      next.tileSets[nextId] = tileSet
    })

    set({ mapData })
  },

  setSelectedTileImage: (imageName: string) => {
    set({ selectedTileImage: imageName })
  },
  setSelectedTileColor: (color: ColorResult) => {
    set({ selectedTileColor: color.rgb })
  },

  setRotation: (rotation: number) => {
    set({ rotation })
  },

  setMapId: (id: string) => {
    let mapData = produce(get().mapData, (next: MapData) => {
      next.id = id
    })

    set({ mapData })
  },
  setMapName: (name: string) => {
    let mapData = produce(get().mapData, (next: MapData) => {
      next.name = name
    })

    set({ mapData })
  },
  removeTile: (tile: TileCoords) => {
    let mapData = produce(get().mapData, (next: MapData) => {
      let key = tileKey(tile.q, tile.r)
      delete next.tiles[key]
    })

    set({ mapData })
  },
  updateTile: (tile: TileCoords & Partial<TileData>) => {
    let prev = get().mapData
    let mapData = produce(prev, (next: MapData) => {
      let key = tileKey(tile.q, tile.r)
      next.tiles[key] = {
        ...prev.tiles[key],
        ...tile,
      }
    })

    set({ mapData })
  },
}))
