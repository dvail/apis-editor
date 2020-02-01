import React, { useState, useRef, useEffect } from 'react'

import m from 'mithril'
import stream from 'mithril/stream'
import * as PIXI from 'pixi.js'
import { Viewport } from 'pixi-viewport'
import range from 'lodash/range'

import { states, actions, tileKey } from '../store'

import ColorUtils from '../colorUtils'
import HexagonGrid from '../hexagonGrid'

// TODO Need to work with these URLs in a reliable way
const completePng = '../../res/hexagonTerrain_sheet.png'
const completeJson = '../../res/hexagonTerrain_sheet.json'

const skeletonTileOpts = { strokeColor: 0xbbbbbb, fillColor: 0x111111, strokeAlpha: 0.1, fillAlpha: 0.1 }
const gridLayoutOps = { gridX: 0, gridY: 0, tileSize: 35, viewAngle: 0.65 }

export default function RenderPane() {
  let initialState = states()
  let previousState = initialState

  let [pixiApp, setPixiApp] = useState(null)
  let [pixiViewport, setPixiViewPort] = useState(null)
  let [skeletonGrid, setSkeletonGrid] = useState(null)
  let [hexGrid, setHexGrid] = useState(null)

  const renderPaneRef = useRef(null);

  let shiftDragCoords = stream(null)
  let dragging = stream(false)
  let shiftKey = stream(initialState.shiftKey)
  let mapData = stream(initialState.mapData)

  function onTileClick(ev, q, r) {
  }

  useEffect(() => {
    initializePixi(renderPaneRef.current)
  }, [])

  function onTileRightClick(ev, q, r) {
    if (dragging()) return

    let shift = ev.data.originalEvent.shiftKey
    let tile = mapData().tiles[tileKey(q, r)]

    if (shift && !tile) return

    let height = tile?.height + (shift ? -1 : 1) || 0
    let opts = tile?.opts ?? {
      fillColor: ColorUtils.shift(0xFF9933, 0, -q * 20, r * 20),
    }

    opts.tileImage = states().selectedTileImage

    // TODO Maybe do away with trying to do delcarative rendering to the PIXI canvas
    // ans create and imperitive/declarative bridge between this and the rest of the UI
    if (height < 0) {
      actions.RemoveTile({ q, r })
    } else {
      actions.UpdateTile({ q, r, height, opts })
    }

    m.redraw();
  }

  function onDragStart(e) {
    let { x, y } = e.data.global

    if (!shiftDragCoords()) {
      shiftDragCoords({ x, y })
    }
  }

  function onDragMove(e) {
    if (!shiftKey()) return
    console.warn('Can I detect event.buttons in here to avoid the dragStart/End methods?')

    let { x, y } = e.data.global

    if (!shiftDragCoords()) {
      shiftDragCoords({ x, y })
    }

    let { x: ox, y: oy } = shiftDragCoords()
    let deltaX = x - ox
    let deltaY = y - oy

    // TODO Configure these magic numbers?
    let xRotations = Math.round(deltaX / 40)
    let yRotations = Math.round(deltaY / 40)

    if (xRotations || yRotations) {
      shiftDragCoords({ x, y })
    }

    if (xRotations < 0) {
      actions.RotateClock()
    } else if (xRotations > 0) {
      actions.RotateCounter()
    }

    if (yRotations < 0) {
      actions.IncreaseAngle()
    } else if (yRotations > 0) {
      actions.DecreaseAngle()
    }

    if (xRotations !== 0 || yRotations !== 0) {
      m.redraw()
    }
  }

  function onDragEnd() {
    shiftDragCoords(null)
  }

  function initializePixi(renderPaneElem) {
    let app = new PIXI.Application({ resizeTo: renderPaneElem })
    renderPaneElem.appendChild(app.view)

    let viewport = new Viewport({ interaction: app.renderer.plugins.interaction })

    app.stage.addChild(viewport)

    let tileTextures = {}

    // TODO
    // TODO This relies on a race condition to get textures to the rest of the app
    // TODO Fix this to handle async loading and asset storage in a real way
    // TODO 
    app.loader
      .add('tile-spritesheet', completeJson)
      .add('tile-spritesheet-png', completePng)
      .load((loader, resources) => {
        let sheet = resources['tile-spritesheet'];
        let sheetPng = resources['tile-spritesheet-png'];

        Object.entries(sheet.data).forEach(([region, { x, y, w, h }]) => {
          tileTextures[region] = new PIXI.Texture(sheetPng.texture, new PIXI.Rectangle(x, y, w, h))
        })

        let test = new PIXI.Sprite(tileTextures["dirt_02.png"])

        test.x = 200
        test.y = 200

        // viewport.addChild(test)
      })

    viewport.drag().wheel()
    viewport.on('drag-start', () => dragging(true))
    viewport.on('drag-end', () => dragging(false))
    viewport.moveCenter(275, 50) // TODO These are magic values...

    let baseGrid = HexagonGrid.create({ ...gridLayoutOps, onTileClick, onTileRightClick })

    let tileGrid = HexagonGrid.create({ ...gridLayoutOps, onTileClick, onTileRightClick, tileTextures })
    // TODO The performance of this probably sucks
    range(-10, 10).forEach(q => {
      range(-10, 10).forEach(r => {
        baseGrid.renderTile({ q, r, height: 0, opts: skeletonTileOpts })
      })
    })

    viewport.addChild(baseGrid.container)

    viewport.on('pointerdown', onDragStart)
      .on('pointerup', onDragEnd)
      .on('pointerupoutside', onDragEnd)
      .on('pointermove', onDragMove)

    viewport.addChild(tileGrid.container)

    setPixiApp(app)
    setPixiViewPort(viewport)
    setSkeletonGrid(baseGrid)
    setHexGrid(tileGrid)
  }

  function onbeforeupdate() {
    let newState = states()

    mapData(newState.mapData)
    shiftKey(newState.shiftKey)

    // TODO Convert this section to make better use of streams?
    if (newState.rotation !== previousState.rotation) {
      hexGrid?.setRotation(newState.rotation)
      skeletonGrid?.setRotation(newState.rotation)
    }

    if (newState.viewAngle !== previousState.viewAngle) {
      hexGrid?.setAngle(newState.viewAngle)
      skeletonGrid?.setAngle(newState.viewAngle)
    }

    if (newState.shiftKey) {
      pixiViewport?.plugins.pause('drag')
    } else {
      pixiViewport?.plugins.resume('drag')
    }

    // Note: This relies on an object reference change, since data updates
    // are immutable, the object reference changing indicates a new set of map
    // tiles.
    if (newState.mapData.tiles !== previousState.mapData.tiles) {
      hexGrid?.renderTiles(newState.mapData.tiles)
    }

    previousState = states()
  }

  return (
    <div ref={renderPaneRef} className='relative flex-1 h-full' onContextMenu={() => false} />
  )
}