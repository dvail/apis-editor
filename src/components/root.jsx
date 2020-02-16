import React, { useEffect } from 'react'

import RenderPane from './renderPane'
import Sidebar from './sidebar'
import Compass from './compass'
import Dock from './dock'
import TileBuilder from './tileBuilder'
import { useStore } from '../store'

export default function Root() {
  const getAll = useStore(state => state.getAll)

  useEffect(() => {
    // Expose state view to console
    window.getAll = getAll
  }, [])

  return (
    <div
      className='h-full flex flex-row bg-black'
      tabIndex={0}
    >
      <Sidebar />
      <TileBuilder />
      <RenderPane />
      <Dock />
      <Compass />
    </div>
  )
}
