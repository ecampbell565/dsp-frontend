import React, { PropTypes } from 'react';
import CSSModules from 'react-css-modules';
import MarkerClusterer from 'node-js-marker-clusterer';
import styles from './DronesMapView.scss';

let clicked = false;
let InfoWindow;

const getIcon = (status) => {
  switch (status) {
    case 'in-motion':
      return 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png';
    case 'idle-ready':
      return 'http://maps.google.com/mapfiles/ms/icons/green-dot.png';
    case 'idle-busy':
      return 'http://maps.google.com/mapfiles/ms/icons/orange-dot.png';
    default:
      throw new Error(`invalid drone status ${status}`);
  }
};

const getLatLng = ({currentLocation}) => ({lng: currentLocation[0], lat: currentLocation[1]});

class DronesMapView extends React.Component {

  componentDidMount() {
    const { drones, mapSettings, droneInfo } = this.props;
    this.map = new google.maps.Map(this.node, mapSettings);
    const projection = map.getProjection();
    const id2Marker = {};

    const markers = drones.map((drone) => {
      const marker = new google.maps.Marker({
        clickable: true,
        crossOnDrag: false,
        cursor: 'pointer',
        position: getLatLng(drone),
        icon: getIcon(drone.status),
        label: drone.name,
      });
      infoWindow = new google.maps.InfoWindow({ content: 'lol' });
      marker.addListener('mouseover', (event) => {
        infoWindow.open(map, marker);
        console.log(event);
      });
      marker.addListener('click', (event) => {
        clicked = true;
        infoWindow.open(map, marker);
        console.log(event);
      });
      marker.addListener('mouseaway', (event) => {
        if(!clicked) infoWindow.close();
      });
      id2Marker[drone.id] = marker;
      return marker;
    });
    this.id2Marker = id2Marker;
    this.markerCluster = new MarkerClusterer(this.map, markers, { imagePath: '/img/m' });
  }

  componentWillReceiveProps(nextProps) {
    const { drones, droneInfo } = nextProps;
    drones.forEach((drone) => {
      const marker = this.id2Marker[drone.id];
      if (marker) {
        marker.setPosition(getLatLng(drone));
        marker.setLabel(drone.name);
      }
    });
    this.markerCluster.repaint();
  }

  shouldComponentUpdate() {
    // the whole logic is handled by google plugin
    return false;
  }

  componentWillUnmount() {
    this.props.disconnect();
  }

  render() {
    return (
      <div>
        <div styleName="map-view" ref={(node) => (this.node = node)}>
        </div>
      </div>
    );
  }
}

DronesMapView.propTypes = {
  drones: PropTypes.array.isRequired,
  disconnect: PropTypes.func.isRequired,
  mapSettings: PropTypes.object.isRequired,
  droneInfo: PropTypes.array.isRequired,
};

export default CSSModules(DronesMapView, styles);
