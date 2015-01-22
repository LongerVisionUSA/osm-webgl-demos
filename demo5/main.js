(function () {
    'use strict';
    // Leaflet map
    var map = L.map('map', {
        minZoom: 2,
        maxZoom: 20,
        inertia: false,
        keyboard: false,
        zoomControl: false
    });

    var map_start_location = [40.71186988568351, -74.01727437973024, 17];

    /*** URL parsing ***/

    // leaflet-style URL hash pattern:
    // #[zoom],[lat],[lng]
    var url_hash = window.location.hash.slice(1, window.location.hash.length).split('/');

    if (url_hash.length == 3) {
        map_start_location = [url_hash[1],url_hash[2], url_hash[0]];
        // convert from strings
        map_start_location = map_start_location.map(Number);
    }

    // setView expects format ([lat, long], zoom)
    map.setView(map_start_location.slice(0, 3), map_start_location[2]);

    var hash = new L.Hash(map);

    // Tangram layer
    var layer = Tangram.leafletLayer({
        scene: 'styles.yaml',
        attribution: 'Map data &copy; OpenStreetMap contributors | <a href="https://github.com/tangrams/tangram">Source Code</a>',
        unloadInvisibleTiles: false,
        updateWhenIdle: false
    });

    /*** Map ***/

    window.map = map;
    window.layer = layer;
    var scene = layer.scene;
    window.scene = scene;
    // Resize map to window
    function resizeMap() {
        document.getElementById('map').style.width = window.innerWidth + 'px';
        document.getElementById('map').style.height = window.innerHeight + 'px';
        map.invalidateSize(false);
    }
    window.addEventListener('resize', resizeMap);
    resizeMap();


    /***** GUI/debug controls *****/

    // GUI options for rendering style/effects
    var style_options = {
        effect: '',
        options: {
            'None': '',
            'Water animation': 'water',
            'Elevator': 'elevator',
            'Breathe': 'breathe',
            'Pop-up': 'popup',
            'Dots': 'dots',
            'Wood': 'wood',
            'B&W Halftone': 'halftone',
            'Color Halftone': 'colorhalftone',
            'Windows': 'windows',
            'Environment Map': 'envmap',
            'Rainbow': 'rainbow'
        },
        setup: function (style) {
            // Restore initial state
            var layer_styles = scene.config.layers;
            for (var l in layer_styles) {
                if (this.initial.layers[l]) {
                    layer_styles[l].style = Object.assign({}, this.initial.layers[l].style);
                }
            };
            gui.camera = scene.config.camera.type = this.initial.camera || scene.config.camera.type;

            // Remove existing style-specific controls
            gui.removeFolder(this.folder);

            // Style-specific settings
            if (style != '') {
                // Save settings to restore later
                for (l in layer_styles) {
                    if (this.initial.layers[l] == null) {
                        this.initial.layers[l] = {
                            style: Object.assign({}, layer_styles[l].style)
                        };
                    }
                }
                this.initial.camera = this.initial.camera || scene.config.camera.type;

                // Remove existing style-specific controls
                gui.removeFolder(this.folder);

                if (this.settings[style] != null) {
                    var settings = this.settings[style] || {};

                    // Change projection if specified
                    gui.camera = scene.config.camera.type = settings.camera || this.initial.camera;

                    // Style-specific setup function
                    if (settings.setup) {
                        settings.uniforms = (scene.styles[style].shaders && scene.styles[style].shaders.uniforms);
                        settings.state = {}; // dat.gui needs a single object to old state

                        this.folder = style[0].toUpperCase() + style.slice(1); // capitalize first letter
                        settings.folder = gui.addFolder(this.folder);
                        settings.folder.open();

                        settings.setup(style);

                        if (settings.folder.__controllers.length === 0) {
                            gui.removeFolder(this.folder);
                        }
                    }
                }
            }

            // Recompile/rebuild
            scene.updateConfig();
            scene.rebuildGeometry();

            // Force-update dat.gui
            for (var i in gui.__controllers) {
                gui.__controllers[i].updateDisplay();
            }
        },
        settings: {
            'water': {
                setup: function (style) {
                    scene.config.layers.water.style.name = style;
                }
            },
            'rainbow': {
                setup: function (style) {
                    scene.config.layers.buildings.style.name = style;
                }
            },
            'popup': {
                setup: function (style) {
                    scene.config.layers.buildings.style.name = style;

                    this.state.popup_radius = this.uniforms.u_popup_radius;
                    this.folder.add(this.state, 'popup_radius', 0, 500).onChange(function(value) {
                        this.uniforms.u_popup_radius = value;
                        scene.requestRedraw();
                    }.bind(this));

                    this.state.popup_height = this.uniforms.u_popup_height;
                    this.folder.add(this.state, 'popup_height', 0, 5).onChange(function(value) {
                        this.uniforms.u_popup_height = value;
                        scene.requestRedraw();
                    }.bind(this));
                }
            },
            'elevator': {
                setup: function (style) {
                    scene.config.layers.buildings.style.name = style;
                }
            },
            'breathe': {
                setup: function (style) {
                    scene.config.layers.buildings.style.name = style;

                    this.state.breathe_scale = this.uniforms.u_breathe_scale;
                    this.folder.add(this.state, 'breathe_scale', 0, 50).onChange(function(value) {
                        this.uniforms.u_breathe_scale = value;
                        scene.requestRedraw();
                    }.bind(this));

                    this.state.breathe_speed = this.uniforms.u_breathe_speed;
                    this.folder.add(this.state, 'breathe_speed', 0, 3).onChange(function(value) {
                        this.uniforms.u_breathe_speed = value;
                        scene.requestRedraw();
                    }.bind(this));
                }
            },
            'dots': {
                setup: function (style) {
                    scene.config.layers.buildings.style.name = style;

                    this.state.background = style_options.scaleColor(this.uniforms.u_dot_background_color, 255);
                    this.folder.addColor(this.state, 'background').onChange(function(value) {
                        this.uniforms.u_dot_background_color = style_options.scaleColor(value, 1 / 255);
                        scene.requestRedraw();
                    }.bind(this));

                    this.state.dot_color = style_options.scaleColor(this.uniforms.u_dot_color, 255);
                    this.folder.addColor(this.state, 'dot_color').onChange(function(value) {
                        this.uniforms.u_dot_color = style_options.scaleColor(value, 1 / 255);
                        scene.requestRedraw();
                    }.bind(this));

                    this.state.grid_scale = this.uniforms.u_dot_grid_scale;
                    this.folder.add(this.state, 'grid_scale', 0, 0.1).onChange(function(value) {
                        this.uniforms.u_dot_grid_scale = value;
                        scene.requestRedraw();
                    }.bind(this));

                    this.state.dot_scale = this.uniforms.u_dot_scale;
                    this.folder.add(this.state, 'dot_scale', 0, 0.4).onChange(function(value) {
                        this.uniforms.u_dot_scale = value;
                        scene.requestRedraw();
                    }.bind(this));
                }
            },
            'wood': {
                setup: function (style) {
                    scene.config.layers.buildings.style.name = style;

                    this.state.wood_color1 = style_options.scaleColor(this.uniforms.u_wood_color1, 255);
                    this.folder.addColor(this.state, 'wood_color1').onChange(function(value) {
                        this.uniforms.u_wood_color1 = style_options.scaleColor(value, 1 / 255);
                        scene.requestRedraw();
                    }.bind(this));

                    this.state.wood_color2 = style_options.scaleColor(this.uniforms.u_wood_color2, 255);
                    this.folder.addColor(this.state, 'wood_color2').onChange(function(value) {
                        this.uniforms.u_wood_color2 = style_options.scaleColor(value, 1 / 255);
                        scene.requestRedraw();
                    }.bind(this));

                    this.state.eccentricity = this.uniforms.u_wood_eccentricity;
                    this.folder.add(this.state, 'eccentricity', -1, 1).onChange(function(value) {
                        this.uniforms.u_wood_eccentricity = value;
                        scene.requestRedraw();
                    }.bind(this));

                    this.state.twist = this.uniforms.u_wood_twist / .0001;
                    this.folder.add(this.state, 'twist', 0, 1).onChange(function(value) {
                        this.uniforms.u_wood_twist = value * .0001;
                        scene.requestRedraw();
                    }.bind(this));

                    this.state.scale = this.uniforms.u_wood_scale / 100;
                    this.folder.add(this.state, 'scale', 0, 1).onChange(function(value) {
                        this.uniforms.u_wood_scale = value * 100;
                        scene.requestRedraw();
                    }.bind(this));
                }
            },
            'colorhalftone': {
                setup: function (style) {
                    scene.config.layers.buildings.style.name = style;
                    scene.config.layers.water.style.name = style;
                    scene.config.layers.landuse.style.name = style;
                    scene.config.layers.earth.style.name = style;

                    this.state.dot_frequency = this.uniforms.dot_frequency;
                    this.folder.add(this.state, 'dot_frequency', 0, 200).onChange(function(value) {
                        this.uniforms.dot_frequency = value;
                        scene.requestRedraw();
                    }.bind(this));

                    this.state.dot_scale = this.uniforms.dot_scale;
                    this.folder.add(this.state, 'dot_scale', 0, 3).onChange(function(value) {
                        this.uniforms.dot_scale = value;
                        scene.requestRedraw();
                    }.bind(this));

                    this.state.true_color = this.uniforms.true_color;
                    this.folder.add(this.state, 'true_color').onChange(function(value) {
                        this.uniforms.true_color = value;
                        scene.requestRedraw();
                    }.bind(this));
                }
            },
            'halftone': {
                setup: function (style) {
                    Object.keys(scene.config.layers).forEach(function(l) {
                        scene.config.layers[l].style.name = style;
                    });

                    scene.config.layers.earth.style.visible = false;
                }
            },
            'windows': {
                camera: 'isometric',
                setup: function (style) {
                    scene.config.layers.buildings.style.name = style;
                }
            },
            'envmap': {
                setup: function (style) {
                    scene.config.layers.buildings.style.name = style;

                    var envmaps = {
                        'Chrome': 'images/LitSphere_test_02.jpg',
                        'Sunset': 'images/sunset.jpg',
                        'Matte Red': 'images/matball01.jpg',
                        'Color Wheel': 'images/wheel.png'
                    };

                    this.state.u_env_map = this.uniforms.u_env_map;
                    this.folder.add(this.state, 'u_env_map', envmaps).onChange(function(value) {
                        this.uniforms.u_env_map = value;
                        scene.requestRedraw();
                    }.bind(this));
                }
            }
        },
        initial: { // initial state to restore to on style switch
            layers: {}
        },
        folder: null, // set to current (if any) DAT.gui folder name, cleared on style switch
        scaleColor: function (c, factor) { // convenience for converting between uniforms (0-1) and DAT colors (0-255)
            if ((typeof c == 'string' || c instanceof String) && c[0].charAt(0) == "#") {
                // convert from hex to rgb
                var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(c);
                c = result ? [
                    parseInt(result[1], 16),
                    parseInt(result[2], 16),
                    parseInt(result[3], 16)
                ] : null;
            }
            return [c[0] * factor, c[1] * factor, c[2] * factor];
        }
    };

    // Create dat GUI
    var gui = new dat.GUI({ autoPlace: true });
    function addGUI () {
        gui.domElement.parentNode.style.zIndex = 5;
        window.gui = gui;

        // Add ability to remove a whole folder from DAT.gui
        gui.removeFolder = function(name) {
            var folder = this.__folders[name];
            if (folder == null) {
                return;
            }

            folder.close();
            folder.__ul.parentNode.removeChild(folder.__ul);
            this.__folders[name] = undefined;
            this.onResize();
        };

        // Camera
        var camera_types = {
            'Flat': 'flat',
            'Perspective': 'perspective',
            'Isometric': 'isometric'
        };
        gui.camera = layer.scene.config.camera.type;
        gui.add(gui, 'camera', camera_types).onChange(function(value) {
            layer.scene.config.camera.type = value;
            layer.scene.updateConfig();
        });

        // Lighting
        var lighting_presets = {
            'Point': {
                type: 'point',
                position: [0, 0, 200],
                ambient: 0.5,
                backlight: true
            },
            'Directional': {
                type: 'directional',
                direction: [-1, 0, -.5],
                ambient: 0.5
            },
            'Spotlight': {
                type: 'spotlight',
                position: [0, 0, 500],
                direction: [0, 0, -1],
                inner_angle: 20,
                outer_angle: 25,
                ambient: 0.2
            },
            'Night': {
                type: 'point',
                position: [0, 0, 50],
                ambient: 0,
                backlight: false
            }
        };
        var lighting_options = Object.keys(lighting_presets);
        for (var k=0; k < lighting_options.length; k++) {
            if (lighting_presets[lighting_options[k]].type === layer.scene.config.lighting.type) {
                gui.lighting = lighting_options[k];
                break;
            }
        }
        gui.add(gui, 'lighting', lighting_options).onChange(function(value) {
            layer.scene.config.lighting = lighting_presets[value];
            layer.scene.updateConfig();
        });

        // Feature selection on hover
        gui['feature info'] = true;
        gui.add(gui, 'feature info');

        // Layers
        var layer_gui = gui.addFolder('Layers');
        var layer_controls = {};
        Object.keys(layer.scene.config.layers).forEach(function(l) {
            if (layer.scene.config.layers[l] == null) {
                return;
            }

            layer_controls[l] = !(layer.scene.config.layers[l].style.visible == false);
            layer_gui.
                add(layer_controls, l).
                onChange(function(value) {
                    layer.scene.config.layers[l].style.visible = value;
                    layer.scene.rebuildGeometry();
                });
        });

        // Styles
        gui.add(style_options, 'effect', style_options.options).
            onChange(style_options.setup.bind(style_options));
    }

    // Feature selection
    function initFeatureSelection () {
        // Selection info shown on hover
        var selection_info = document.createElement('div');
        selection_info.setAttribute('class', 'label');
        selection_info.style.display = 'block';

        // Show selected feature on hover
        scene.container.addEventListener('mousemove', function (event) {
            if (gui['feature info'] == false) {
                if (selection_info.parentNode != null) {
                    selection_info.parentNode.removeChild(selection_info);
                }

                return;
            }

            var pixel = { x: event.clientX, y: event.clientY };

            scene.getFeatureAt(pixel).then(function(selection) {
                var feature = selection.feature;
                if (feature != null) {
                    var label = '';
                    if (feature.properties.name != null) {
                        label = feature.properties.name;
                    }

                    // if (feature.properties.layer == 'buildings' && feature.properties.height) {
                    //     if (label != '') {
                    //         label += '<br>';
                    //     }
                    //     label += feature.properties.height + 'm';
                    // }

                    if (label != '') {
                        selection_info.style.left = (pixel.x + 5) + 'px';
                        selection_info.style.top = (pixel.y + 15) + 'px';
                        selection_info.innerHTML = '<span class="labelInner">' + label + '</span>';
                        scene.container.appendChild(selection_info);
                    }
                    else if (selection_info.parentNode != null) {
                        selection_info.parentNode.removeChild(selection_info);
                    }
                }
                else if (selection_info.parentNode != null) {
                    selection_info.parentNode.removeChild(selection_info);
                }
            });

            // Don't show labels while panning
            if (scene.panning == true) {
                if (selection_info.parentNode != null) {
                    selection_info.parentNode.removeChild(selection_info);
                }
            }
        });
    }

    /***** Render loop *****/
    window.addEventListener('load', function () {
        // Scene initialized
        layer.on('init', function() {
            addGUI();
            initFeatureSelection();
        });
        layer.addTo(map);

    });


}());

