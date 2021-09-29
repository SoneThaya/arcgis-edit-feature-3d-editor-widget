import React, { useEffect, useRef } from "react";
import { loadModules } from "esri-loader";

const Map = () => {
  const MapEl = useRef(null);

  useEffect(() => {
    loadModules([
      "esri/layers/FeatureLayer",
      "esri/WebScene",
      "esri/views/SceneView",
      "esri/widgets/Editor",
      "esri/widgets/Expand",
      "esri/core/watchUtils",
    ]).then(
      ([FeatureLayer, WebScene, SceneView, Editor, Expand, watchUtils]) => {
        let checkboxArray = []; // Array containing checkboxDiv's referencing feature snapping layers
        let snapSource = []; // Holds the source (feature layers) for the snapping configuration

        // Div elements to toggle snapping
        const enabledSnapDiv = document.getElementById("enabledcheckbox");
        const selfSnapDiv = document.getElementById("selfsnappingcheckbox");
        const featureSnapDiv = document.getElementById(
          "featuresnappingcheckbox"
        );

        // Create a map from the referenced webscene item id
        const webscene = new WebScene({
          portalItem: {
            id: "206a6a13162c4d9a95ea6a87abad2437",
          },
        });
        // Create a layer with visualVariables to use interactive handles for size and rotation
        const recreationLayer = new FeatureLayer({
          title: "Recreation",
          url: "https://services.arcgis.com/V6ZHFr6zdgNZuVG0/arcgis/rest/services/EditableFeatures3D/FeatureServer/1",
          elevationInfo: {
            mode: "absolute-height",
          },
          renderer: {
            type: "unique-value", // autocasts as new UniqueValueRenderer()
            field: "TYPE",
            visualVariables: [
              {
                // size can be modified with the interactive handle
                type: "size",
                field: "SIZE",
                axis: "height",
                valueUnit: "meters",
              },
              {
                // rotation can be modified with the interactive handle
                type: "rotation",
                field: "ROTATION",
              },
            ],
            uniqueValueInfos: [
              {
                value: "1",
                label: "Slide",
                symbol: {
                  type: "point-3d", // autocasts as new PointSymbol3D()
                  symbolLayers: [
                    {
                      type: "object",
                      resource: {
                        href: "https://static.arcgis.com/arcgis/styleItems/Recreation/gltf/resource/Slide.glb",
                      },
                    },
                  ],
                  styleOrigin: {
                    styleName: "EsriRecreationStyle",
                    name: "Slide",
                  },
                },
              },
              {
                value: "2",
                label: "Swing",
                symbol: {
                  type: "point-3d", // autocasts as new PointSymbol3D()
                  symbolLayers: [
                    {
                      type: "object",
                      resource: {
                        href: "https://static.arcgis.com/arcgis/styleItems/Recreation/gltf/resource/Swing.glb",
                      },
                    },
                  ],
                  styleOrigin: {
                    styleName: "EsriRecreationStyle",
                    name: "Swing",
                  },
                },
              },
            ],
          },
        });

        webscene.add(recreationLayer);

        const view = new SceneView({
          container: "viewDiv",
          qualityProfile: "high",
          map: webscene,
        });

        view.when(() => {
          view.popup.autoOpenEnabled = false; //disable popups
          // Create the Editor
          const editor = new Editor({
            view: view,
            // If no UI is desired, it is possible to set all snapping configurations directly
            // on the Editor in its SnappingOptions similar to the code snippet below. Toggling
            // snapping on/off can be achieved via the CTRL key.

            // snappingOptions: { // autocasts to SnappingOptions
            //   enabled: true,
            //   selfEnabled: true,
            //   featureEnabled: true,
            //   featureSources: [{ layer: recreationLayer}]
            // }
          });
          // Add widget to top-right of the view
          view.ui.add(editor, "top-right");

          // Create the UI for feature snapping layer source configurations
          view.map.loadAll().then(() => {
            view.map.allLayers.forEach((layer) => {
              if (
                layer.visible &&
                (layer.geometryType === "polygon" ||
                  layer.geometryType === "polyline" ||
                  layer.geometryType === "point")
              ) {
                const table = document
                  .getElementById("configurationTable")
                  .getElementsByTagName("tbody")[0];
                const row = table.insertRow();
                let cell = row.insertCell();
                cell.style = "padding-left: 10px";
                const label = document.createElement("label");
                label.innerHTML = layer.title + " (" + layer.geometryType + ")";
                cell.appendChild(label);
                let checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.disabled = true;
                checkbox.name = layer.title;
                checkbox.id = layer.uid;

                cell = row.insertCell();
                cell.appendChild(checkbox);
                checkboxArray.push(checkbox); // add each checkbox (layer to snap) into the array

                // Store all the feature layers
                snapSource.push({
                  layer: layer,
                });

                checkbox.addEventListener("change", (event) => {
                  // Check if the checkbox is checked (true), if so add the feature snap layer source if feature snapping is enabled
                  if (event.target.checked) {
                    snapSource.push({
                      layer: layer,
                    });
                  } else {
                    // If not checked, remove that feature source snap layer
                    const index = getIndex(snapSource, layer.id);
                    snapSource.splice(index, 1);
                  }
                  editor.snappingOptions.featureSources = snapSource;
                });
              }
            });
          });

          // Watch for when global snapping is enabled/disabled
          watchUtils.init(editor.snappingOptions, "enabled", (value) => {
            enabledSnapDiv.checked = editor.snappingOptions.enabled;
            editor.snappingOptions.featureSources = snapSource;
          });

          enabledSnapDiv.addEventListener("change", (event) => {
            editor.snappingOptions.enabled = event.target.checked
              ? true
              : false;

            // Disable the self and feature snapping checkboxes if global snapping is disabled
            selfSnapDiv.disabled = !editor.snappingOptions.enabled; //true;
            selfSnapDiv.checked = editor.snappingOptions.enabled; //false;

            featureSnapDiv.disabled = !editor.snappingOptions.enabled; //true;
            featureSnapDiv.checked = editor.snappingOptions.enabled; //false;

            // Disable and uncheck the feature source snapping layers if global snapping is disabled
            checkboxArray.forEach((chkBox) => {
              chkBox.disabled = !editor.snappingOptions.enabled; //true;
              chkBox.checked = editor.snappingOptions.enabled; //false;
            });
          });

          // Listen for for when self snapping is toggled and set the
          // selfEnabled property accordingly
          selfSnapDiv.addEventListener("change", (event) => {
            editor.snappingOptions.selfEnabled = event.target.checked
              ? true
              : false;
          });

          // Listen for for when feature snapping is toggled and set the
          // featureEnabled property accordingly
          featureSnapDiv.addEventListener("change", (event) => {
            editor.snappingOptions.featureEnabled = event.target.checked
              ? true
              : false;
          });

          // Make sure that feature snapping is enabled and then check layers. If disabled, uncheck layers.
          watchUtils.watch(
            editor.snappingOptions,
            "featureEnabled",
            (value) => {
              // If feature snapping is disabled, uncheck the feature source snapping layers and disable checkbox
              console.log("featureEnabled changed to: ", value);
              if (!value) {
                checkboxArray.forEach((checkDiv) => {
                  checkDiv.disabled = true;
                });
              } else {
                // If feature snapping is enabled, check the feature source snapping layers and enable checkbox
                checkboxArray.forEach((checkDiv) => {
                  checkDiv.disabled = false;
                });
              }
            }
          );

          const configurationExpand = new Expand({
            expandIconClass: "esri-icon-settings2",
            expandTooltip: "Show snapping configuration",
            expanded: false,
            view: view,
            content: document.getElementById("configurationDiv"),
          });

          view.ui.add([
            {
              component: configurationExpand,
              position: "bottom-right",
              index: 0,
            },
            {
              component: "info",
              position: "bottom-right",
              index: 1,
            },
          ]);

          // If the snapping configuration is toggled open, hide the info window
          configurationExpand.watch("expanded", (value) => {
            if (value) {
              document.getElementById("info").classList.add("esri-hidden");
            } else {
              document.getElementById("info").classList.remove("esri-hidden");
            }
          });
        });

        // get index position of the FeatureSnappingLayerSource
        function getIndex(source, layerId) {
          const layers = source.map((item) => {
            return item.layer.id;
          });
          return layers.indexOf(layerId);
        }
      }
    );
  }, []);

  return (
    <>
      <div
        id="viewDiv"
        style={{ height: "100vh", width: "100vw" }}
        ref={MapEl}
      ></div>
      <div id="info" className="esri-widget">
        <b>Snapping configuration &#8594;</b>
      </div>
      <div id="editorDiv"></div>
      <div id="configurationDiv" class="esri-widget">
        <table id="configurationTable">
          <tbody>
            <tr>
              <td>
                <label for="enabledcheckbox" id="enabledcheckboxlabel">
                  <b>SnappingOptions.enabled</b>
                </label>
              </td>
              <td>
                <input type="checkbox" id="enabledcheckbox" />
              </td>
            </tr>
            <tr>
              <td style={{ paddingLeft: "5px" }}>
                <label
                  for="selfsnappingcheckbox"
                  id="selfsnappingcheckboxlabel"
                >
                  SnappingOptions.selfEnabled
                </label>
              </td>
              <td>
                <input
                  type="checkbox"
                  id="selfsnappingcheckbox"
                  disabled="disabled"
                />
              </td>
            </tr>
            <tr>
              <td style={{ paddingLeft: "5px" }}>
                <label
                  for="featuresnappingcheckbox"
                  id="featuresnappingcheckboxlabel"
                >
                  SnappingOptions.featureEnabled
                </label>
              </td>
              <td>
                <input
                  type="checkbox"
                  id="featuresnappingcheckbox"
                  disabled="disabled"
                />
              </td>
            </tr>
            <tr>
              <td>
                <hr style={{ margin: "5px" }} />
              </td>
            </tr>
            <tr>
              <td>
                <label>
                  <b>SnappingOptions.featureSources</b>
                </label>
              </td>
            </tr>
            <tr>
              <td style={{ paddingBottom: "5px" }}>
                <label>(layers used for feature snapping)</label>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
};

export default Map;
