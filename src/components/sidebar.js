import first from 'lodash/first'
import uuidv4 from 'uuid/v4'

import { saveObject, html } from '../util'
import FaIcon from './faIcon'

function mapLoad(e, state, actions) {
  let file = first(e.target.files)
  let reader = new FileReader()

  reader.onload = event => {
    actions.MapLoad(JSON.parse(event.target.result))
  }

  reader.readAsText(file)
}

export default {
  view: ({ attrs: { state, actions } }) => {
    let id = uuidv4()

    return html`
      <div class='bg-gray-900 p-3 flex flex-col justify-between'>
        <div class='flex flex-col'>
          <${FaIcon} type='fa-magic' title='Create New Tile' onclick=${() => actions.ToggleTileBuilder()} />
        </div>
        <div class='flex flex-col'>
          <${FaIcon} type='fa-save' title='Save Map' onclick=${() => saveObject(state.mapData, 'map.json')} />
          <label for=${id}>
            <input class='hidden' id=${id} type='file' onchange=${e => mapLoad(e, state, actions)}/>
            <${FaIcon} type='fa-file-upload' title='Load Map' />
          </label>
        </div>
      </div>
    `
  },
}
