import { handleActions } from 'redux-actions';
import io from 'socket.io-client';
import APIService from 'services/APIService';
import config from '../../../../config/default';

// Drones will be updated and map will be redrawn every 3s
// Otherwise if drones are updated with high frequency (e.g. 0.5s), the map will be freezing
const MIN_REDRAW_DIFF = 3000;

// can't support more than 10k drones
// map will be very slow
const DRONE_LIMIT = 10000;

let socket;
let pendingUpdates = {};
let lastUpdated = null;
let updateTimeoutId;

// ------------------------------------
// Constants
// ------------------------------------
export const DRONES_LOADED = 'DronesMap/DRONES_LOADED';
export const DRONES_UPDATED = 'DronesMap/DRONES_UPDATED';
export const DRONE_INFO_LOADED = 'DronesMap/DRONE_INFO_LOADED';

// ------------------------------------
// Actions
// ------------------------------------


// load drones and initialize socket
export const init = () => async(dispatch) => {
  const { body: {items: drones} } = await APIService.searchDrones({limit: DRONE_LIMIT});
  const droneInfo = drones.map(async (drone) => {
    return await APIService.getDroneInfo(drone.id);
  });
  lastUpdated = new Date().getTime();
  dispatch({ type: DRONES_LOADED, payload: {drones} });
  dispatch({ type: DRONE_INFO_LOADED, payload: droneInfo});
  socket = io(config.API_BASE_PATH);
  socket.on('dronepositionupdate', (drone) => {
    pendingUpdates[drone.id] = drone;
    if (updateTimeoutId) {
      return;
    }
    updateTimeoutId = setTimeout(() => {
      dispatch({ type: DRONES_UPDATED, payload: pendingUpdates });
      pendingUpdates = {};
      updateTimeoutId = null;
      lastUpdated = new Date().getTime();
    }, Math.max(MIN_REDRAW_DIFF - (new Date().getTime() - lastUpdated)), 0);
  });
};

// disconnect socket
export const disconnect = () => () => {
  socket.disconnect();
  socket = null;
  clearTimeout(updateTimeoutId);
  updateTimeoutId = null;
  pendingUpdates = {};
  lastUpdated = null;
};

export const actions = {
  init,
  disconnect,
};

// ------------------------------------
// Reducer
// ------------------------------------
export default handleActions({
  [DRONES_LOADED]: (state, { payload: {drones} }) => ({ ...state, drones }),
  [DRONE_INFO_LOADED]: (state, { payload: info }) => ({...state, droneInfo: info }),
  [DRONES_UPDATED]: (state, { payload: updates }) => ({
    ...state,
    drones: state.drones.map((drone) => {
      const updated = updates[drone.id];
      return updated || drone;
    }),
  }),
}, {
  drones: null,
  // it will show the whole globe
  mapSettings: {
    zoom: 3,
    center: { lat: 0, lng: 0 },
  },
  droneInfo: null,
});
