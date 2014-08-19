var g_drawhelper;
var g_selected_obj;
var g_prev_selected_obj;
var g_czmls = {};
//var g_geojson_towers = {"type": "FeatureCollection","features": []};
var g_geojsons = {};
var g_lines = {};
var g_codes = {};
var g_segments = [];
var g_gltf_models = {};
var g_dlg_tower_info;
var g_contextmenu_metal;
var g_selected_metal_item;
var g_geometry_segments = [];
var g_geometry_lines = {};
var g_use_catenary = true;
var g_models = [];
var g_is_tower_focus = false;
var g_primitive_material_unselect, g_polyline_material_unselect, g_polygon_material_unselect;
var g_buffers = {};
var g_borders = {};
var g_image_slider_tower_info;
var g_image_thumbnail_tower_info = [];
var g_terrain_z_offset = -40;
var g_dn_connect_mode = false;

g_max_file_size = 5000000;


/*
	jquery全局初始化函数
*/
$(function() {
	$.jGrowl.defaults.closerTemplate = '<div class="bubblestylesuccess">关闭所有提示信息</div>';
	ShowProgressBar(true, 670, 200, '载入中', '正在载入，请稍候...');
	//if(true) return;
	var viewer = InitCesiumViewer();
	$.viewer = viewer;
	InitLogout(viewer);

	InitWebGISFormDefinition();
	InitDrawHelper(viewer);
	g_drawhelper.close();
	InitPoiInfoDialog();
	InitTowerInfoDialog();
	//$(window).on('message',function(e) {
		////console.log('recv:' + text);
		//var text = e.originalEvent.data;
		//console.log('recv:' + text);
		//var obj = JSON.parse(text);
		//console.log(obj);
		
	//});
	InitSearchBox(viewer);
	InitToolPanel(viewer);
	InitModelList(viewer);
	InitBird(viewer);
	InitKeyboardEvent(viewer);
	
	
	ShowProgressBar(true, 670, 200, '载入中', '正在载入南网编码规范，请稍候...');
	LoadCodeData(g_db_name, function(){
		ShowProgressBar(true, 670, 200, '载入中', '正在载入线路信息，请稍候...');
		LoadLineData(g_db_name, function(){
			ShowProgressBar(true, 670, 200, '载入中', '正在载入架空线路信息，请稍候...');
			LoadSegments(g_db_name, function(){
				ShowProgressBar(true, 670, 200, '载入中', '正在载入3D模型信息，请稍候...');
				LoadModelsList(g_db_name, function(){
					//var name = '永发I回线';
					//var name = '七罗I回';
					//LoadTowerByLineName(viewer, g_db_name,  name, function(){
						//LoadLineByLineName(viewer, g_db_name, name, function(){
							//var extent = GetExtentByCzml();
							//FlyToExtent(viewer, extent['west'], extent['south'], extent['east'], extent['north']);
							//ReloadCzmlDataSource(viewer, g_zaware);
						//});
					//});
					
					//var extent = GetDefaultExtent(g_db_name);
					//FlyToExtent(viewer, extent['west'], extent['south'], extent['east'], extent['north']);
					
					LoadAllDNNode(viewer, g_db_name, function(){
						LoadAllDNEdge(viewer, g_db_name, function(){
							var extent = GetExtentByCzml();
							FlyToExtent(viewer, extent['west'], extent['south'], extent['east'], extent['north']);
							ReloadCzmlDataSource(viewer, g_zaware);
						});
					});
				
				});
			});
		});
	});
	//LoadBorder(viewer, g_db_name, {'properties.name':'云南省'});
	//LoadBorder(viewer, g_db_name, {'properties.type':'cityborder'});
	//LoadBorder(viewer, g_db_name, {'properties.type':'countyborder'});
	//$('#' + 'aaa' ).fontIconPicker({
		//source: ['icon-marker', 'icon-tower'],
		//theme: 'fip-darkgrey',
		//emptyIcon: false,
		//hasSearch: false
	//});

});


function LoadAllDNEdge(viewer, db_name, callback)
{
	var cond = {'db':db_name, 'collection':'edges', 'properties.webgis_type':'edge_dn'};
	MongoFind(cond, function(data){
		if(data.length>0)
		{
			for(var i in data)
			{
				var id = data[i]['_id'];
				if(!g_geojsons[id]) g_geojsons[id] = data[i];
				DrawSegmentsBetweenTwoDNNode(viewer, g_geojsons[id]['properties']['start'],g_geojsons[id]['properties']['end'], false);
			}
		}
		if(callback) callback(data);
	});
}
function LoadAllDNNode(viewer, db_name, callback)
{
	var cond = {'db':db_name, 'collection':'features', 'properties.webgis_type':'point_dn'};
	MongoFind(cond, function(data){
		//console.log(data);
		if(data.length>0)
		{
			for(var i in data)
			{
				var id = data[i]['_id'];
				if(!g_geojsons[id]) g_geojsons[id] = AddTerrainZOffset(data[i]);
				if(!g_czmls[id]) g_czmls[id] = CreateCzmlFromGeojson(g_geojsons[id]);
			}
			if(callback) callback(data);
		}
	});
}
function InitCesiumViewer()
{
	var providerViewModels = [];
	//providerViewModels.push(new Cesium.ImageryProviderViewModel({
				//name : 'OSM卫星图',
				//iconUrl : 'img/wmts-sat.png',
				//tooltip : 'OSM卫星图',
				//creationFunction : function() {
					//return new Cesium.OpenStreetMapImageryProvider({
						////url :  g_host + 'wmts',
					//});
				//}
			//}));
	//providerViewModels.push(new Cesium.ProviderViewModel({
				//name : 'YNCFT',
				//iconUrl : 'img/wmts-map.png',
				//tooltip : 'YNCFT',
				//creationFunction : function() {
					//return new ArcgisTileImageryProvider({
						//url : g_host + 'arcgistile',
						//is_esri:true
					//});
				//}
			//}));
	providerViewModels.push(new Cesium.ProviderViewModel({
				name : 'YN_SAT',
				iconUrl : 'img/wmts-sat.png',
				tooltip : 'YN_SAT',
				creationFunction : function() {
					return new Cesium.ArcGisMapServerImageryProvider({
						url : 'http://localhost:6080/arcgis/rest/services/YN_SAT/ImageServer'
						//usePreCachedTilesIfAvailable:false
					});
				}
			}));
	//providerViewModels.push(new Cesium.ProviderViewModel({
				//name : '卫星图',
				//iconUrl : 'img/wmts-sat.png',
				//tooltip : '卫星图',
				//creationFunction : function() {
					//return new WMTSImageryProvider({
						//url :  g_host + 'wmts',
						//imageType:'google_sat'
					//});
				//}
			//}));
	//providerViewModels.push(new Cesium.ProviderViewModel({
				//name : '地图',
				//iconUrl : 'img/wmts-map.png',
				//tooltip : '地图',
				//creationFunction : function() {
					//return new WMTSImageryProvider({
						//url :  g_host + 'wmts',
						////url :  "http://cf-storage:88/" + 'wmts',
						//imageType:'google_map'
					//});
				//}
			//}));
	providerViewModels.push(new Cesium.ProviderViewModel({
				name : 'CTF卫星图',
				iconUrl : 'img/wmts-sat.png',
				tooltip : 'CTF卫星图',
				creationFunction : function() {
					return new CFTTileImageryProvider({
						url :  g_host + 'tiles',
						imageType:'google_sat'
					});
				}
			}));
	providerViewModels.push(new Cesium.ProviderViewModel({
				name : 'CTF地图',
				iconUrl : 'img/wmts-map.png',
				tooltip : 'CTF地图',
				creationFunction : function() {
					return new CFTTileImageryProvider({
						url :  g_host + 'tiles',
						imageType:'google_map'
					});
				}
			}));
	//providerViewModels.push(new Cesium.ProviderViewModel({
				//name : '地图',
				//iconUrl : 'img/wmts-map.png',
				//tooltip : 'amap地图',
				//creationFunction : function() {
					//return new WMTSImageryProvider({
						//url :  g_host + 'wmts',
						////url :  "http://cf-storage:88/" + 'wmts',
						//imageType:'amap_map'
					//});
				//}
			//}));
	//providerViewModels.push(new Cesium.ProviderViewModel({
		//name : 'Bing Maps Aerial',
		//iconUrl : 'img/bingAerial.png',
		//tooltip : 'Bing Maps aerial imagery \nhttp://www.bing.com/maps',
		//creationFunction : function() {
			//return new Cesium.BingMapsImageryProvider({
				//url : 'http://dev.virtualearth.net',
				//mapStyle : Cesium.BingMapsStyle.AERIAL
				////proxy : proxyIfNeeded
			//});
		//}
	//}));
	
	//providerViewModels.push(new Cesium.ProviderViewModel({
		//name : 'Bing Maps Aerial with Labels',
		//iconUrl : 'img/bingAerialLabels.png',
		//tooltip : 'Bing Maps aerial imagery with label overlays \nhttp://www.bing.com/maps',
		//creationFunction : function() {
			//return new Cesium.BingMapsImageryProvider({
				//url : 'http://dev.virtualearth.net',
				//mapStyle : Cesium.BingMapsStyle.AERIAL_WITH_LABELS
				////proxy : proxyIfNeeded
			//});
		//}
	//}));
	
	
	var terrainProviderViewModels = [];
	terrainProviderViewModels.push(new Cesium.ProviderViewModel({
		name : '无地形',
		iconUrl : Cesium.buildModuleUrl('Widgets/Images/TerrainProviders/Ellipsoid.png'),
		tooltip : 'no-terrain',
		creationFunction : function() {
			return new Cesium.EllipsoidTerrainProvider();
		}
	}));


	//terrainProviderViewModels.push(new Cesium.ProviderViewModel({
		//name : 'STK 世界地形',
		//iconUrl : Cesium.buildModuleUrl('Widgets/Images/TerrainProviders/STK.png'),
		//tooltip : 'High-resolution, mesh-based terrain for the entire globe. Free for use on the Internet. Closed-network options are available.\nhttp://www.agi.com',
		//creationFunction : function() {
			////return new Cesium.CesiumTerrainProvider({
			//return new HeightmapAndQuantizedMeshTerrainProvider({
				//url : '//cesiumjs.org/stk-terrain/tilesets/world/tiles',
				//credit : 'Terrain data courtesy Analytical Graphics, Inc.'
			//});
		//}
	//}));

	//terrainProviderViewModels.push(new Cesium.ProviderViewModel({
		//name : 'ASTER-30 GDEM 中国云南',
		//iconUrl : Cesium.buildModuleUrl('/img/aster-gdem.png'),
		//tooltip : 'ASTER - 30 中国云南',
		//creationFunction : function() {
			////return new Cesium.CesiumTerrainProvider({
			//return new HeightmapAndQuantizedMeshTerrainProvider({
				////url : "http://cf-storage:88/" + "terrain",
				//url : g_host + "terrain",
				//credit : ''
			//});
		//}
	//}));
	terrainProviderViewModels.push(new Cesium.ProviderViewModel({
		name : 'quantized-mesh中国云南',
		iconUrl : Cesium.buildModuleUrl('/img/aster-gdem.png'),
		tooltip : 'quantized-mesh中国云南',
		creationFunction : function() {
			return new HeightmapAndQuantizedMeshTerrainProvider({
				url : "terrain",
				terrain_type : 'quantized_mesh',
				credit : ''
			});
		}
	}));
	//terrainProviderViewModels.push(new Cesium.ProviderViewModel({
		//name : 'Small Terrain heightmaps with water',
		//iconUrl : Cesium.buildModuleUrl('Widgets/Images/TerrainProviders/STK.png'),
		//tooltip : 'Medium-resolution, heightmap-based terrain for the entire globe. This tileset also includes a water mask. Free for use on the Internet.\nhttp://www.agi.com',
		//creationFunction : function() {
			//return new Cesium.CesiumTerrainProvider({
				//url : '//cesiumjs.org/smallterrain',
				//credit : 'Terrain data courtesy Analytical Graphics, Inc.'
			//});
		//}
	//}));
	
	var viewer = new Cesium.Viewer('cesiumContainer',{
		scene3DOnly:true,
		animation:false,
		baseLayerPicker:true,
		geocoder:false,
		timeline:false,
		selectionIndicator:true,
		sceneModePicker:false,
		navigationInstructionsInitiallyVisible:false,
		infoBox:true,
		imageryProviderViewModels:providerViewModels,
		terrainProviderViewModels:terrainProviderViewModels
		//terrainProvider:new Cesium.CesiumTerrainProvider({
			////url: g_host + "terrain"
			//url: "http://cf-storage:88/" + "terrain"
		//})
	});
	//console.log(viewer.scene.camera.frustum.fov);
	viewer.scene.camera.frustum.fov = Cesium.Math.PI_OVER_TWO;
	//console.log(viewer.scene.camera.frustum.fov);
	TranslateToCN();
	TowerInfoMixin(viewer);
	//viewer.extend(Cesium.viewerCesiumInspectorMixin);

    //viewer.scene.globe.depthTestAgainstTerrain = false;
	
	//var handler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
	//handler.setInputAction(
		//function (movement) {
			//var pick = scene.pick(movement.endPosition);
			//if (Cesium.defined(pick) && Cesium.defined(pick.node) && Cesium.defined(pick.mesh)) {
				//console.log('node: ' + pick.node.name + '. mesh: ' + pick.mesh.name);
			//}
		//},
		//Cesium.ScreenSpaceEventType.MOUSE_MOVE
	//);
	return viewer;
}

function InitKeyboardEvent(viewer)
{
	$(document).on('keyup', function(e){
		if(e.keyCode == 17)//ctrl
		{
			g_dn_connect_mode = !g_dn_connect_mode;
			if(g_dn_connect_mode)
			{
				//$(".jGrowl-notification:last-child").remove();
				$.jGrowl('<div>连接模式开启</div><span id="div_edge_instruction"></span><button  id="btn_edge_save">保存</button>', { 
					sticky:true,
					//life:3000,
					position: 'bottom-right', //top-left, top-right, bottom-left, bottom-right, center
					theme: 'bubblestylesuccess',
					glue:'before',
					afterOpen:function(){
						$('#btn_edge_save').off();
						$('#btn_edge_save').on('click', function(){
							//if(g_selected_obj)
							//{
								//console.log(g_selected_obj.id);
							//}
							SaveDNEdge(viewer, null, function(data){
								$('#btn_edge_save').attr('disabled','disabled');
								if(data.length>0)
								{
									for(var i in data)
									{
										var g = data[i];
										if(!g_geojsons[g['_id']]) g_geojsons[g['_id']] = g;
									}
									$.jGrowl("保存成功", { 
										life: 2000,
										position: 'bottom-right', //top-left, top-right, bottom-left, bottom-right, center
										theme: 'bubblestylesuccess',
										glue:'before'
									});
								}
							});
						});
						$('#btn_edge_save').attr('disabled','disabled');
					}
				});
			}
			else
			{
				//$(".jGrowl-notification:last").trigger('jGrowl.close');
				$('.jGrowl-notification').trigger('jGrowl.close');
				$.jGrowl("连接模式关闭", { 
					life:3000,
					position: 'bottom-right', //top-left, top-right, bottom-left, bottom-right, center
					theme: 'bubblestylesuccess',
					glue:'before'
				});
			}
		}
		if(e.keyCode == 46)//delete
		{
			if(g_selected_obj && g_selected_obj.id && g_selected_obj.id.properties && g_selected_obj.id.properties.webgis_type === 'edge_dn')
			{
				var get_name = function()
				{
					var s0 = '', s1 = '';
					var id0 = g_selected_obj.id.properties.start;
					var id1 = g_selected_obj.id.properties.end;
					if(g_geojsons[id0]) s0 = g_geojsons[id0].properties.name;
					if(g_geojsons[id1]) s1 = g_geojsons[id1].properties.name;
					return s0 + '-' + s1;
				};
				var get_id = function()
				{
					var ret;
					for(var k in g_geojsons)
					{
						var g = g_geojsons[k];
						if(g.properties.start == g_selected_obj.id.properties.start && g.properties.end == g_selected_obj.id.properties.end)
						{
							ret = g['_id'];
							break;
						}
					}
					return ret;
				};
				var name = get_name();
				ShowConfirm(null, 400, 180, '删除确认', '你确认要删除[' + name + ']之间的联系吗?', function(){
					//console.log(g_selected_obj.id);
					var id = get_id();
					if(id)
					{
						var cond = {'db':g_db_name, 'collection':'edges', 'action':'remove', '_id':id};
						MongoFind( cond, 
							function(data){
								if(data.length>0)
								{
									if(data[0]['ok'] === 1)
									{
										$.jGrowl("删除成功", { 
											life:2000,
											position: 'bottom-right', //top-left, top-right, bottom-left, bottom-right, center
											theme: 'bubblestylesuccess',
											glue:'before'
										});
									}else
									{
									}
								}
						});
					}
					RemoveSegmentsBetweenTwoNode(viewer, {id:g_selected_obj.id.properties.start},{id:g_selected_obj.id.properties.end});
					
				});
			}
			if(g_selected_obj && g_selected_obj.id && (g_selected_obj.point || g_selected_obj.polyline || g_selected_obj.polygon) && g_geojsons[g_selected_obj.id]  && 
			(  g_geojsons[g_selected_obj.id]['properties']['webgis_type'] === 'point_marker'
			|| g_geojsons[g_selected_obj.id]['properties']['webgis_type'] === 'point_hazard'
			|| g_geojsons[g_selected_obj.id]['properties']['webgis_type'] === 'point_dn'
			|| g_geojsons[g_selected_obj.id]['properties']['webgis_type'] === 'polyline_marker'
			|| g_geojsons[g_selected_obj.id]['properties']['webgis_type'] === 'polyline_hazard'
			|| g_geojsons[g_selected_obj.id]['properties']['webgis_type'] === 'polygon_marker'
			|| g_geojsons[g_selected_obj.id]['properties']['webgis_type'] === 'polygon_hazard'
			|| g_geojsons[g_selected_obj.id]['properties']['webgis_type'] === 'polygon_buffer'
			))
			{
				ShowConfirm(null, 400, 180, '删除确认', '你确认要删除对象[' + g_geojsons[g_selected_obj.id]['properties']['name'] + ']吗?', function(){
					//console.log(g_selected_obj.id);
					var cond = {'db':g_db_name, 'collection':'features', 'action':'remove', '_id':g_selected_obj.id};
					MongoFind( cond, 
						function(data){
							if(data.length>0)
							{
								//console.log(data[0]);
								if(data[0]['ok'] === 1)
								{
									$.jGrowl("删除成功", { 
										life:2000,
										position: 'bottom-right', //top-left, top-right, bottom-left, bottom-right, center
										theme: 'bubblestylesuccess',
										glue:'before'
									});

									if(g_geojsons[g_selected_obj.id])
									{
										delete g_geojsons[g_selected_obj.id];
										g_geojsons[g_selected_obj.id] = undefined;
										//console.log(g_geojsons[g_selected_obj.id]);
									}
									if(g_czmls[g_selected_obj.id])
									{
										delete g_czmls[g_selected_obj.id];
										g_czmls[g_selected_obj.id] = undefined;
										//console.log(g_czmls[g_selected_obj.id]);
									}
									g_prev_selected_obj = undefined;
									g_selected_obj = undefined;
									viewer.selectedEntity = undefined;
									viewer.trackedEntity = undefined;
									ReloadCzmlDataSource(viewer, g_zaware, true);
								}
							}
					});
				});
			}
		}
	});
}





function Logout(callback)
{
	var cond = {'db':g_db_name, 'collection':'userinfo', 'url':'/logout'};
	MongoFind(cond, function(data){
		if(callback) callback(data);
	});

}
function InitLogout(viewer)
{
    var LogoutButtonViewModel = function() {
        var that = this;
        this._command = Cesium.createCommand(function() {
            console.log('logout');
			ShowConfirm(null, 500, 200,
				'登出确认',
				'确认要登出吗?',
				function(){
					Logout(function(data){
						if(data.length>0)
						{
							if(data[0] == 'ok')
							{
								window.location.href = '/webgis_login.html';
							}
						}
					});
				},
				function(){
				}
			);
        });
        this.tooltip = '退出';
    };

    Cesium.defineProperties(LogoutButtonViewModel.prototype, {
        command : {
            get : function() {
                return this._command;
            }
        }
    });
	
    var LogoutButton = function(options) {
        if (!Cesium.defined(options) || !Cesium.defined(options.container)) {
            throw new Cesium.DeveloperError('options.container is required.');
        }
        var container = Cesium.getElement(options.container);

        var viewModel = new LogoutButtonViewModel();
        viewModel._svgPath = 'M0 765.76q0 83.936 59.292 143.472t143.228 59.536h72.224q33.184 0 56.852 -23.668t23.668 -56.852 -23.668 -56.852 -56.852 -23.668h-72.224q-17.08 0 -29.524 -12.2t-12.444 -29.768v-531.92q0 -17.08 12.444 -29.28t29.524 -12.2h72.224q33.184 0 56.852 -23.668t23.668 -56.852 -23.668 -56.608 -56.852 -23.424h-72.224q-83.936 0 -143.228 59.048t-59.292 142.984v531.92zm238.144 -251.808q0 -33.184 23.668 -56.608t56.852 -23.424h344.04l-109.8 -110.776q-23.912 -23.424 -23.912 -56.852t23.912 -56.852q23.424 -23.424 56.608 -23.424t56.608 23.424l247.416 247.904q23.424 23.424 23.424 56.608t-23.424 56.608l-242.536 242.536q-23.424 23.424 -56.608 23.424t-57.096 -23.424q-23.424 -23.424 -23.424 -56.608t23.912 -57.096l104.92 -104.92h-344.04q-32.696 0 -56.608 -23.912t-23.912 -56.608z';
        var wrapper = document.createElement('span');
        wrapper.className = 'cesium-navigationHelpButton-wrapper';
        container.appendChild(wrapper);

        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'cesium-button cesium-toolbar-button cesium-navigation-help-button';
        button.setAttribute('data-bind', '\
attr: { title: tooltip },\
click: command,\
cesiumSvgPath: { path: _svgPath, width: 1024, height: 1024 }');
        wrapper.appendChild(button);
        Cesium.knockout.applyBindings(viewModel, wrapper);

        this._container = container;
        this._viewModel = viewModel;
        this._wrapper = wrapper;

    };

    Cesium.defineProperties(LogoutButton.prototype, {
        container : {
            get : function() {
                return this._container;
            }
        },
        viewModel : {
            get : function() {
                return this._viewModel;
            }
        }
    });

    LogoutButton.prototype.isDestroyed = function() {
        return false;
    };

    LogoutButton.prototype.destroy = function() {
        Cesium.knockout.cleanNode(this._wrapper);
        this._container.removeChild(this._wrapper);
        return Cesium.destroyObject(this);
    };
	var logoutButton = new LogoutButton({
		container : $('.cesium-viewer-toolbar')[0]
	});

}

function InitBird(viewer)
{
	$('#tower_info_test').drawChart({});
}

function InitDrawHelper(viewer)
{
	var ellipsoid = viewer.scene.globe.ellipsoid;
	g_drawhelper = new DrawHelper(viewer, 'drawhelpertoolbar');
	var toolbar = g_drawhelper.addToolbar($('#' + g_drawhelper.toolbar_container_id)[0], {
		buttons: ['marker', 'polyline', 'polygon', 'circle', 'extent']
	});
	
	
    var drawHelperCoverAreaMaterial = Cesium.Material.fromType('Color', {
		color : new Cesium.Color(1.0, 1.0, 0.0, 0.5)
	});
	
	
	toolbar.addListener('markerCreated', function(event) {
		console.log('Marker created at ' + GetDisplayLatLngString(ellipsoid, event.position, 7));
		// create one common billboard collection for all billboards
		var b = new Cesium.BillboardCollection();
		//var a = new Cesium.TextureAtlas({scene:viewer.scene});
		//b.textureAtlas = a;
		viewer.scene.primitives.add(b);
		g_drawhelper.addPrimitive(b);
		//var image = new Image();
		//image.onload = function() {
			//a.addImage(image);
		//};
		//image.src = 'img/location_marker.png';
		var billboard = b.add({
			show : true,
			position : event.position,
			pixelOffset : new Cesium.Cartesian2(0, 0),
			eyeOffset : new Cesium.Cartesian3(0.0, 0.0, 0.0),
			horizontalOrigin : Cesium.HorizontalOrigin.CENTER,
			verticalOrigin : Cesium.VerticalOrigin.BOTTOM,
			scale : 0.15,
			//imageIndex : 0,
			image: 'img/location_marker.png',
			color : new Cesium.Color(1.0, 1.0, 1.0, 1.0)
		});
		//billboard.setEditable();
		ShowPoiInfoDialog(viewer, '添加兴趣点', 'point', event.position);
	});
	toolbar.addListener('polylineCreated', function(event) {
		event.positions.pop();
		event.positions.pop();
		console.log('Polyline created with ' + event.positions.length + ' points');
		//console.log(event.positions);
		var polyline = new DrawHelper.PolylinePrimitive({
			positions: event.positions,
			width: 5,
			geodesic: true
		});
		viewer.scene.primitives.add(polyline);
		g_drawhelper.addPrimitive(polyline);
		ShowPoiInfoDialog(viewer, '添加线段或道路', 'polyline', event.positions);
		//polyline.setEditable();
		//polyline.addListener('onEdited', function(event) {
			//console.log('Polyline edited, ' + event.positions.length + ' points');
		//});

	});
	toolbar.addListener('polygonCreated', function(event) {
		event.positions.pop();
		event.positions.pop();
		console.log('Polygon created with ' + event.positions.length + ' points');
		var polygon = new DrawHelper.PolygonPrimitive({
			positions: event.positions,
			material : drawHelperCoverAreaMaterial
		});
		viewer.scene.primitives.add(polygon);
		g_drawhelper.addPrimitive(polygon);
		ShowPoiInfoDialog(viewer, '添加多边形区域', 'polygon', event.positions);
		//polygon.setEditable();
		//polygon.addListener('onEdited', function(event) {
			//console.log('Polygon edited, ' + event.positions.length + ' points');
		//});

	});
	toolbar.addListener('circleCreated', function(event) {
		console.log('Circle created: center is ' + event.center.toString() + ' and radius is ' + event.radius.toFixed(1) + ' meters');
		var circle = new DrawHelper.CirclePrimitive({
			center: event.center,
			radius: event.radius,
			material: drawHelperCoverAreaMaterial
		});
		viewer.scene.primitives.add(circle);
		g_drawhelper.addPrimitive(circle);
		//circle.setEditable();
		//circle.addListener('onEdited', function(event) {
			//console.log('Circle edited: radius is ' + event.radius.toFixed(1) + ' meters');
		//});
	});
	toolbar.addListener('extentCreated', function(event) {
		var extent = event.extent;
		console.log('Extent created (N: ' + extent.north.toFixed(3) + ', E: ' + extent.east.toFixed(3) + ', S: ' + extent.south.toFixed(3) + ', W: ' + extent.west.toFixed(3) + ')');
		var extentPrimitive = new DrawHelper.ExtentPrimitive({
			extent: extent,
			material: drawHelperCoverAreaMaterial
		});
		viewer.scene.primitives.add(extentPrimitive);
		g_drawhelper.addPrimitive(extentPrimitive);
		//extentPrimitive.setEditable();
		//extentPrimitive.addListener('onEdited', function(event) {
			//console.log('Extent edited: extent is (N: ' + event.extent.north.toFixed(3) + ', E: ' + event.extent.east.toFixed(3) + ', S: ' + event.extent.south.toFixed(3) + ', W: ' + event.extent.west.toFixed(3) + ')');
		//});
	});

}

function InitFileUploader(photo_container_id, uploader_container_id, toggle_id, toolbar_id,  bindcollection, key, category) 
{
	$('#' + toggle_id).off();
	$('#' + toggle_id).on('click', function(){
		$('#div_upload_desciption').css('display','none');
		if($('#' + uploader_container_id).css('display') === 'none')
		{
			$('#' + uploader_container_id).css('display', 'block');
			$('#' + photo_container_id).css('display', 'none');
			$('#' + toolbar_id).css('display', 'none');
			if(category === 'photo')
				$('#' + toggle_id).html('照片浏览');
			else
				$('#' + toggle_id).html('文件浏览');
		}
		else
		{
			$('#' + uploader_container_id).css('display', 'none');
			$('#' + photo_container_id).css('display', 'block');
			$('#' + toolbar_id).css('display', 'block');
			if(category === 'photo')
				$('#' + toggle_id).html('上传照片');
			else
				$('#' + toggle_id).html('上传文件');
		}
	});

    // Initialize the jQuery File Upload widget:
    $('#' + uploader_container_id + '_form').fileupload({
        // Uncomment the following to send cross-domain cookies:
        //xhrFields: {withCredentials: true},
        url: g_host + 'post',
		multipart:true,
		autoUpload: false,
		sequentialUploads:true,
		submit: function(e, data){
			console.log('submit key=' +  key);
			console.log(data);
			$(this).fileupload('option', 'url', g_host + 'post' + '?' 
			+ 'db=' + g_db_name 
			//+ '&collection=fs'
			+ '&bindcollection=towers' 
			+ '&key=' + key 
			+ '&category=' + 'photo' 
			+ '&mimetype=' + encodeURIComponent(data.files[0].type) 
			//+ '&filename=' + encodeURIComponent(data.files[0].name)
			//+ '&size=' + data.files[0].size
			+ '&description=' + encodeURIComponent($('#upload_desciption').val())
			);
		},
		change:function(){
			$('#div_upload_desciption').css('display','block');
		},
		done:function(e, data){
			console.log('done');
			if(data.result)
			{
				console.log(data.result);
				UpdateJssorSlider(photo_container_id, toggle_id, 520,400, bindcollection, key, category);
				$('#upload_desciption').val('');
			}
		},
		fail:function(e, data){
			console.log('fail');
			console.log(data);
		}
    });

    // Enable iframe cross-domain access via redirect option:
    $('#' + uploader_container_id + '_form').fileupload(
        'option',
        'redirect',
        window.location.href.replace(
            /\/[^\/]*$/,
            '/cors/result.html?%s'
        )
    );


    if (g_max_file_size > 0) {
        // Demo settings:
        $('#' + uploader_container_id + '_form').fileupload('option', {
            url: '/post',
            // Enable image resizing, except for Android and Opera,
            // which actually support image resizing, but fail to
            // send Blob objects via XHR requests:
            disableImageResize: /Android(?!.*Chrome)|Opera/
                .test(window.navigator.userAgent),
            maxFileSize: g_max_file_size,
            acceptFileTypes: /(\.|\/)(gif|jpe?g|png)$/i
        });
        // Upload server status check for browsers with CORS support:
        if ($.support.cors) {
            $.ajax({
                url: 'post',
                type: 'HEAD'
            }).fail(function () {
                $('<div class="alert alert-danger"/>')
                    .text('文件上传服务不可用 ' +
                            new Date())
                    .appendTo('#' + uploader_container_id + '_form');
            });
        }
    } else {
        // Load existing files:
        $('#' + uploader_container_id +  '_form').addClass('fileupload-processing');
        $.ajax({
            // Uncomment the following to send cross-domain cookies:
            //xhrFields: {withCredentials: true},
            url: $('#' + uploader_container_id + '_form').fileupload('option', 'url'),
            dataType: 'json',
            context: $('#' + uploader_container_id + '_form')[0]
        }).always(function () {
            $(this).removeClass('fileupload-processing');
        }).done(function (result) {
            $(this).fileupload('option', 'done')
                .call(this, $.Event('done'), {result: result});
        });
    }

}




function InitPoiInfoDialog()
{
	//$('#form_poi_info' ).webgisform("getvalidate");

}
function InitTowerInfoDialog()
{
	var iframe = $('#tower_info_model').find('iframe');
	iframe.load(function(){
		var iframeDoc = iframe.contents().get(0);
		$(iframeDoc).off();
		$(iframeDoc).on('mousedown', function(e){
			for (var i = 1; i < 99; i++)
			{
				iframe[0].contentWindow.clearInterval(i);
			}
		});
	});
	//$('#form_tower_info_base' ).webgisform("getvalidate");
	//$('#form_tower_info_metal' ).webgisform("getvalidate");
	$('#upload_desciption').resizable({
		minHeight:100,
		minWidth:450
	});
	
	$(document).tooltip({
		items: "[data-tower-photo], [data-filename]",
		show: {
		  effect: "slideDown",
		  delay: 300
		},
		content: function()
		{
			var element = $( this );
			var s = '';
			if(g_image_slider_tower_info && g_image_thumbnail_tower_info.length>0 && element.is( "[data-tower-photo]" ))
			{
				var idx = g_image_slider_tower_info.$CurrentIndex();
				var img = g_image_thumbnail_tower_info[idx];
				s = '<div class="tower-photo-tip">';
				s += '<p>文件名称:' + img.filename + '</p>';
				s += '<p>备注:' + img.description + '</p>';
				s += '</div>';
			}
			if ( element.is( "[data-filename]" ) ) {
				s = element.attr( "data-filename" );
			}
			return s;
		}
	});
	
	$('#tower_info_photo_toolbar').find('span[class="phototoolbar-edit"]').on('click', function(){
		
	});
	$('#tower_info_photo_toolbar').find('span[class="phototoolbar-delete"]').on('click', function(){
		if(g_image_slider_tower_info && g_image_thumbnail_tower_info.length>0)
		{
			var idx = g_image_slider_tower_info.$CurrentIndex();
			var img = g_image_thumbnail_tower_info[idx];
			//console.log(img._id + ' ' + img.filename);
			
			ShowConfirm(null, 500, 300,
				'删除确认',
				'确认要删除文件[' + img.filename + ']吗?',
				function(){
					var data = {op:'gridfs_delete','db':g_db_name,_id:img._id};
					GridFsFind(data, function(){
						UpdateJssorSlider('tower_info_photo_container', 'div_toggle_view_upload', 500, 400, 'towers', img.key, 'photo');
					});
				},
				function(){
				},
				img
			);
		}
		
	});

}
function InitToolPanel(viewer)
{
	$('#control_toolpanel_kmgd_left').css('display', 'none');
	$('#control_toolpanel_kmgd_handle').on( 'mouseenter', function(e){
		$('#control_toolpanel_kmgd_left').show('slide',{}, 400, function(){
			$(e.target).css('display','none');
		});
	});
	$('#control_toolpanel_kmgd_left').on( 'mouseleave', function(e){
		$('#control_toolpanel_kmgd_left').hide('slide',{}, 400, function(){
			$('#control_toolpanel_kmgd_handle').css('display','block');
		});
	});
	$( "#accordion_tools" ).accordion({ 
		active: 0,
		animate: 20
	});
	
	$('input[id^=chb_show_label_]').iCheck({
		checkboxClass: 'icheckbox_flat-green'
	});
	
	//$('#chb_show_label').on('click', function(){
	$('input[id^=chb_show_label_]').on("ifChanged", function(e){
		var webgis_type = $(this).attr('id').replace('chb_show_label_', '');
		if($(this).is(':checked'))
		{
			console.log('turn on label:' + webgis_type);
		}else
		{
			console.log('turn off label:' + webgis_type);
		}
		ReloadCzmlDataSource(viewer, g_zaware);
	});
	
	$('#but_add_poi').button({label:'添加兴趣点'});
	$('#but_add_poi').on('click', function(){
		if(g_drawhelper.isVisible())
		{
			g_drawhelper.close();
		}
		else
		{
			g_drawhelper.show();
		}
	});
	$('#but_remove_poi').button({label:'清空兴趣点'});
	$('#but_remove_poi').on('click', function(){
		ClearPoi(viewer);
	});
	
	$('#but_dn_add').button({label:'新增配电网络'});
	$('#but_dn_add').on('click', function(){
		ShowDNAddDialog(viewer);
	});
	$('#but_dn_remove').button({label:'清空配电网络'});
	$('#but_dn_remove').on('click', function(){
		RemoveSegmentsByType(viewer, 'edge_dn');
	});
}
function ClearPoi(viewer)
{
	var scene = viewer.scene;
	delete g_czmls;
	g_czmls = {};
	ReloadCzmlDataSource(viewer, g_zaware, true);
	for(var k in g_gltf_models)
	{
		var m = g_gltf_models[k];
		if(scene.primitives.contains(m))
		{
			var b = scene.primitives.remove(m);
			console.log(b);
		}
	}
}

function TranslateToCN()
{
	$($('.cesium-baseLayerPicker-sectionTitle')[0]).html('地表图源');
	//$($('.cesium-baseLayerPicker-sectionTitle')[0]).attr('imgtype', 'imagery');
	$($('.cesium-baseLayerPicker-sectionTitle')[1]).html('3D地型数据源');
	//$($('.cesium-baseLayerPicker-sectionTitle')[1]).attr('imgtype', 'terrain');
	$('.cesium-navigation-help-pan').html('平移');
	$('.cesium-navigation-help-pan').siblings().html('左键点击 + 拖动');
	$('.cesium-navigation-help-zoom').html('缩放');
	$($('.cesium-navigation-help-zoom').siblings()[0]).html('右键点击 + 拖动, 或');
	$($('.cesium-navigation-help-zoom').siblings()[1]).html('鼠标滚轮');
	$('.cesium-navigation-help-rotate').html('视角旋转');
	$($('.cesium-navigation-help-rotate').siblings()[0]).html('中键点击 + 拖动, 或');
	$($('.cesium-navigation-help-rotate').siblings()[1]).html('CTRL + 左键点击 + 拖动');
}

function InitModelList(viewer)
{
	//$('#tower_info_model_list_toggle').button();
	//$('#tower_info_model_list_toggle').on( 'mouseenter', function(e){
		//$(e.target).css('cursor', 'hand');
	//});
	//$('#tower_info_model_list_toggle').on( 'mouseleave', function(e){
		//$(e.target).css('cursor', 'pointer');
	//});
	$('#tower_info_model_list_toggle').on('click', function(e) {
		if($('#tower_info_model_list').css('display') == 'block')
		{
			$(e.target).find('a').html('>>显示列表');
			$('#tower_info_model_list').css('display', 'none');
			$('#tower_info_model').find('iframe').css('width', '99%');
		}
		else
		{
			$(e.target).find('a').html('<<隐藏列表');
			$('#tower_info_model_list').css('display', 'block');
			$('#tower_info_model').find('iframe').css('width', '79%');
		}
	});
	
	$('#tower_info_model_list_filter').on('keyup', function(e){
		var text = $(e.target).val();
		FilterModelList(text);
	});
}

function GetCheckedBoxList(prefix)
{
	var ret = [];
	$.each($( "input[id^=" + prefix + "]"), function(i, element){
		if($(element).is(':checked'))
		{
			ret.push($(element).attr('id').replace(prefix,''));
		}
	});
	return ret;
}
function InitSearchBox(viewer)
{
	$('#button_search_clear').on( 'click', function(){
		var v = $('#input_search').val();
		//console.log(v);
		if(v.length>0)
		{
			$('#input_search').val('');
			$('#text_search_waiting').css('display','block');
			$('#text_search_waiting').html('输入关键字拼音首字母');
			$('#input_search').focus();
		}
		else
		{
			$('#input_search').hide('slide',{}, 500, function(){
				$('#button_search_clear').css('display','none');
				$('#text_search_waiting').css('display','none');
				$('#div_search_option').css('display','none');
			});
			$('#button_search').css('background-color', '#FFFFFF');
		}

	});
	$( "input[id^=chb_search_webgis_type_]").iCheck({
		checkboxClass: 'icheckbox_flat-green'
	});
	$( "#chb_search_webgis_type_point_tower").iCheck('check');
	$( "input[id^=chb_search_webgis_type_]").on("ifChanged", function(e){
	});
	
	//$( "#input_search" ).css("border", "1px 1px 0px 1px solid #00FF00");
	$( "#input_search" ).on('keyup',function(e){
		if($(e.target).val().length > 0)
		{
			$('#text_search_waiting').css('display','none');
		}
	});
	$( "#div_search_option_toggle label" ).on('mouseenter',function(e){
		if($("#div_search_option_toggle label").html() == "更多选项&gt;&gt;")
		{
			$('#div_search_option_panel').show({
				effect: "slide",
				direction: "up",
				duration: 400,
				complete:function(){
					$("#div_search_option_toggle label").html("");
					$('#div_search_option').css("border", "0px 1px 0px 1px solid #00FF00");
					$('#div_search_option_panel').css("border", "0px 1px 1px 1px solid #00FF00");
				}
			});
		}
	});
	$( "#div_search_option_panel" ).on('mouseleave',function(e){
		$('#div_search_option_panel').hide({
			effect: "slide",
			direction: "up",
			duration: 400,
			complete:function(){
				$( "#div_search_option_toggle label").html("更多选项&gt;&gt;");
			}
		});
	});
	
	
	$( "#input_search" ).autocomplete({
		autoFocus:true,
		minLength:2,
		delay: 500,
		_resizeMenu: function() {
			this.menu.element.outerHeight( 500 );
		},		
		source:function(request,  response)
		{
			var tylist = GetCheckedBoxList('chb_search_webgis_type_');
			var py_cond = {'db':g_db_name, 'collection':'features;lines', 'action':'pinyinsearch', 'py':request.term, 'type':tylist};
			$('#text_search_waiting').css('display','block');
			$('#text_search_waiting').html('正在查询，请稍候...');
			MongoFind( py_cond, 
				function(data){
					$('#text_search_waiting').css('display','none');
					response(BuildSearchItemList(data));
			});
		},
		select: function( event, ui ) {
			//console.log(ui.item.geojson);
			var get_center = function(geojson)
			{
				var ret = [];
				if(geojson.geometry.type === 'Point')
				{
					ret.push(geojson.geometry.coordinates[0]);
					ret.push(geojson.geometry.coordinates[1]);
				}
				else if(geojson.geometry.type === 'LineString')
				{
					var idx = Math.floor(geojson.geometry.coordinates.length/2);
					ret.push(geojson.geometry.coordinates[idx][0]);
					ret.push(geojson.geometry.coordinates[idx][1]);
				}
				else if(geojson.geometry.type === 'Polygon')
				{
					var x=0, y=0;
					for(var i in geojson.geometry.coordinates[0])
					{
						x += geojson.geometry.coordinates[0][i][0];
						y += geojson.geometry.coordinates[0][i][1];
					}
					ret.push(x/geojson.geometry.coordinates[0].length);
					ret.push(y/geojson.geometry.coordinates[0].length);
				}
				return ret;
			};
			if(ui.item.geojson && ui.item.geojson.geometry)
			{
				var center = get_center(ui.item.geojson);
				if(center.length === 2)
				{
					FlyToPoint(viewer, center[0], center[1], 2000, 1.05, 4000);
				}
				ShowSearchResult(viewer, ui.item.geojson);
			}
			else if(ui.item.geojson && ui.item.geojson.properties && ui.item.geojson.properties.webgis_type && ui.item.geojson.properties.webgis_type === 'polyline_line')
			{
				var name = ui.item.geojson.properties.name;
				if(name)
				{
					LoadTowerByLineName(viewer, g_db_name, name, function(){
						LoadLineByLineName(viewer, g_db_name, name, function(){
							var extent = GetExtentByCzml();
							FlyToExtent(viewer, extent['west'], extent['south'], extent['east'], extent['north']);
							ReloadCzmlDataSource(viewer, g_zaware);
						});
					});
				}
			}
		}
	});
	$('#button_search').on( 'click', function(){
			if($('#input_search').css('display') == 'none')
			{
				$('#input_search').show('slide',{}, 400, function(){
					$('#button_search_clear').css('display','block');
					$('#text_search_waiting').css('display','block');
					$('#div_search_option').css('display','block');
					$('#input_search').focus();
				});
				$('#button_search').css('background-color', '#00FF00');
				
			}else
			{
				$('#input_search').hide('slide',{}, 500, function(){
					$('#button_search_clear').css('display','none');
					$('#text_search_waiting').css('display','none');
					$('#div_search_option').css('display','none');
				});
				$('#button_search').css('background-color', '#FFFFFF');
			}
	});
	$('#button_search').on( 'mouseenter', function(){
		$('#button_search').css('background-color', '#00FFFF');
	});
	$('#button_search').on( 'mouseleave', function(){
		$('#button_search').css('background-color', '#FFFFFF');
		if($('#input_search').css('display') !== 'none')
		{
			$('#button_search').css('background-color', '#00FF00');
		}
	});

}


function BuildSearchItemList(data)
{
	var ret = $.map( data, function( item, idx ) {
		var name = '';
		var pos;
		if(item.properties && item.properties.name) name = item.properties.name;
		if(item.geometry)
		{
			if(item.geometry.type == 'Point')
			{
				pos = item.geometry.coordinates;
			}
			if(item.geometry.type == 'LineString')
			{
				var idx = item.geometry.coordinates.length/2;
				pos = item.geometry.coordinates[idx];
			}
			if(item.geometry.type == 'Polygon')
			{
				var x=0, y=0;
				for(var i in item.geometry.coordinates)
				{
					x += item.geometry.coordinates[i][0];
					y += item.geometry.coordinates[i][1];
				}
				pos = [x / item.geometry.coordinates.length, y / item.geometry.coordinates.length];
			}
		}
		return {
		  label: name,
		  value: name,
		  pos:pos,
		  geojson:item
		};
	});
	return ret;
}

function ShowSearchResult(viewer, geojson)
{
	//console.log(geojson);
	if(geojson['_id'])
	{
		if(geojson['properties'] )
		{
			var _id = geojson['_id'];
			if(!g_geojsons[_id])
			{
				g_geojsons[_id] = AddTerrainZOffset(geojson);
			}
			if(!g_czmls[_id])
			{
				if(g_geojsons[_id]['properties']['webgis_type'].indexOf('point_')>-1)
					g_czmls[_id] = CreatePointCzmlFromGeojson(g_geojsons[_id]);
				else if(g_geojsons[_id]['properties']['webgis_type'].indexOf('polyline_')>-1)
					g_czmls[_id] = CreatePolyLineCzmlFromGeojson(g_geojsons[_id]);
				else if(g_geojsons[_id]['properties']['webgis_type'].indexOf('polygon_')>-1)
					g_czmls[_id] = CreatePolygonCzmlFromGeojson(g_geojsons[_id]);
				ReloadCzmlDataSource(viewer, g_zaware);
			}
		}
	}
}


function CreatePolygonCzmlFromGeojson(geojson)
{
	
	var get_center = function(positions){
		var x=0, y=0, z=0;
		for(var i in positions)
		{
			if(i%3 == 0) x += positions[i];
			if(i%3 == 1) y += positions[i];
			if(i%3 == 2) z += positions[i];
		}
		var len = positions.length/3;
		x = x/len;
		y = y/len;
		z = z/len;
		return [x, y, z];
	};
	var cz = {};
	var name = '';
	cz['id'] = geojson['_id'];
	cz['webgis_type'] = geojson['properties']['webgis_type'];
	cz['position'] = {};
	cz['polygon'] = {};
	cz['polygon']['positions'] = {};
	name = geojson['properties']['name'];
	var positions = GetVertexPositionsByGeojsonPolyline(geojson['geometry'], geojson['properties']['height']);
	cz['polygon']['positions']['cartographicDegrees'] = positions;
	var center = get_center(positions);
	cz['position']['cartographicDegrees'] = center;
	cz['name'] = name;
	cz['polygon']['material'] = {};
	cz['polygon']['material']['solidColor'] = {};
	var style = geojson['properties']['style'];
	var v;

	if(style && style.color) v = style.color;
	else v = GetDefaultStyleValue(cz['webgis_type'], 'color')
	cz['polygon']['material']['solidColor']['color'] = {'rgba':v};
	//if(style.image)
	//{
		//cz['polygon']['material']['image'] = {};
		//cz['polygon']['material']['image']['image'] = {'uri':style.image};
	//}
	cz['polygon']['perPositionHeight'] = {'boolean':false};
	cz['polygon']['height'] = {'number': 0};
	cz['polygon']['extrudedHeight'] = {'number': 0};
	if(cz['webgis_type'] === 'polygon_buffer')
	{
		cz['polygon']['extrudedHeight'] = {'number': 3000};
	}
	else
	{
		if(geojson['properties']['height'])
		{
			cz['polygon']['extrudedHeight'] = {'number': center[2] + geojson['properties']['height'] * 10};
		}
		else
		{
			cz['polygon']['extrudedHeight'] = {'number': center[2] * 2};
		}
	}
	cz['polygon']['fill'] = {'boolean':true};
	cz['polygon']['outline'] = {'boolean':true};
	if(style && style.outline_color) v = style.outline_color;
	else v = GetDefaultStyleValue(cz['webgis_type'], 'outlineColor')
	cz['polygon']['outlineColor'] = {'rgba': v};
	cz['polygon']['show'] = {'boolean':true};
	cz['label'] = {};
	if(style && style.label_fill_color) v = style.label_fill_color;
	else v = GetDefaultStyleValue(cz['webgis_type'], 'labelFillColor')
	cz['label']['fillColor'] = {'rgba': v};
	cz['label']['horizontalOrigin'] = 'LEFT';
	if(style && style.label_outline_color) v = style.label_outline_color;
	else v = GetDefaultStyleValue(cz['webgis_type'], 'labelOutlineColor')
	cz['label']['outlineColor'] = {'rgba': v};
	cz['label']['pixelOffset'] = {'cartesian2':[20.0, 0.0]};
	if(style && style.label_scale) v = style.label_scale;
	else v = GetDefaultStyleValue(cz['webgis_type'], 'labelScale')
	cz['label']['scale'] = {'number': v};
	cz['label']['show'] = {'boolean':false};
	cz['label']['style'] = 'FILL';
	cz['label']['font'] = 'normal normal bold 32px arial';
	cz['label']['text'] = name;
	cz['label']['verticalOrigin'] = 'CENTER';
	cz['description'] = '<!--HTML-->\r\n<p>' + name + '</p>';
	return cz;
}

function CreatePolyLineCzmlFromGeojson(geojson)
{
	var get_line_style = function(geojson){
		var ret = {};
		var color = '#000000';
		if(geojson.properties.voltage == '13')
		{
			color = '#FF0000';
		}
		if(geojson.properties.voltage == '15')
		{
			color = '#0000FF';
		}
		var rgba = tinycolor(color).toRgb();
		rgba.a = Math.floor(0.5 * 256);
		ret['color'] = [ rgba.r , rgba.g , rgba.b , rgba.a ];
		ret['outline_color'] = [ 0, 0, 0, 255 ];
		ret['outline_width'] = 1;
		ret['label_fill_color'] = [255, 128, 0, 255];
		ret['label_outline_color'] = [0, 0, 0, 255];
		ret['label_scale'] = 1;
		ret['pixel_width'] = 5;
		return ret;
	};

	var get_center = function(positions){
		var i0 = Math.floor(positions.length/2);
		var i1 = i0+1;
		var i2 = i0+2;
		return [positions[i0], positions[i1], positions[i2]];
	};
	var cz = {};
	var name = geojson['properties']['name'];
	cz['id'] = geojson['_id'];
	cz['webgis_type'] = geojson['properties']['webgis_type'];
	cz['position'] = {};
	cz['polyline'] = {};
	cz['polyline']['positions'] = {};
	if(cz['webgis_type']==='polyline_line')
	{
		var positions = GetVertexPositionsByTowerPairs(geojson['properties']['towers_pair']);
		cz['polyline']['positions']['cartographicDegrees'] = positions;
		cz['position']['cartographicDegrees'] = get_center(positions);
	}
	else
	{
		var positions = GetVertexPositionsByGeojsonPolyline(geojson['geometry'], geojson['properties']['height']);
		cz['polyline']['positions']['cartographicDegrees'] = positions;
		cz['position']['cartographicDegrees'] = get_center(positions);
	}
	cz['name'] = name;
	cz['polyline']['material'] = {};
	cz['polyline']['material']['solidColor'] = {};
	var style;
	if(geojson['properties']['voltage'])
	{
		style = get_line_style(geojson);
	}else
	{
		style = geojson['properties']['style'];
	}
	var v;
	if(style && style.color) v = style.color;
	else v = GetDefaultStyleValue(cz['webgis_type'], 'color')
	cz['polyline']['material']['solidColor']['color'] = {'rgba':v};
	if(style && style.pixel_width) v = style.pixel_width;
	else v = GetDefaultStyleValue(cz['webgis_type'], 'pixelWidth')
	cz['polyline']['width'] = {'number':v};
	cz['polyline']['material']['polylineOutline'] = {};
	if(style && style.outline_color) v = style.outline_color;
	else v = GetDefaultStyleValue(cz['webgis_type'], 'outlineColor')
	cz['polyline']['material']['polylineOutline']['outlineColor'] = {'rgba': v};
	cz['polyline']['material']['polylineOutline']['outlineWidth'] = {'number': 1};
	cz['polyline']['show'] = {'boolean':true};
	cz['label'] = {};
	if(style && style.label_fill_color) v = style.label_fill_color;
	else v = GetDefaultStyleValue(cz['webgis_type'], 'labelFillColor')
	cz['label']['fillColor'] = {'rgba': v};
	cz['label']['horizontalOrigin'] = 'LEFT';
	if(style && style.label_outline_color) v = style.label_outline_color;
	else v = GetDefaultStyleValue(cz['webgis_type'], 'labelOutlineColor')
	cz['label']['outlineColor'] = {'rgba': v};
	cz['label']['pixelOffset'] = {'cartesian2':[20.0, 0.0]};
	if(style && style.label_scale) v = style.label_scale;
	else v = GetDefaultStyleValue(cz['webgis_type'], 'labelScale')
	cz['label']['scale'] = {'number': v};
	cz['label']['show'] = {'boolean':false};
	cz['label']['style'] = 'FILL';
	cz['label']['font'] = 'normal normal bold 32px arial';
	cz['label']['text'] = name;
	cz['label']['verticalOrigin'] = 'CENTER';
	cz['description'] = '<!--HTML-->\r\n<p>' + name + '</p>';
	return cz;
}

function CreatePointCzmlFromGeojson(geojson)
{
	var cz = {};
	cz['id'] = geojson['_id'];
	cz['webgis_type'] = geojson['properties']['webgis_type'];
	cz['billboard'] = {};
	cz['billboard']['color'] = {'rgba':[255, 255, 255, 255]};
	cz['billboard']['horizontalOrigin'] = 'CENTER';
	cz['billboard']['verticalOrigin'] = 'BOTTOM';
	cz['billboard']['scale'] = {'number':1.0};
	cz['billboard']['show'] = {'boolean':false};
	var name = geojson['properties']['name'];
	var subtype = cz['webgis_type'];
	if(geojson['properties']['function_type'] === 'PAE')
	{
		subtype = 'point_dn_switch'
	}
	if(geojson['properties']['function_type'] === 'PAB')
	{
		subtype = 'point_dn_transform'
	}
	if(geojson['properties']['function_type'] === 'PLM')
	{
		subtype = 'point_dn_link'
	}
	if(geojson['properties']['function_type'] === 'T')
	{
		subtype = 'point_dn_transformarea'
	}
	//console.log(subtype);
	var style = g_style_point_mapping[subtype];
	var v;
	var icon_img = 'img/marker30x48.png';
	if(subtype === 'point_tower')
	{
		icon_img = style['icon_img'];
	}
	else
	{
		cz['billboard']['show'] = {'boolean':true};
		style = geojson['properties']['style'];
		if(style && style.icon && style.icon.uri) 
		{
			icon_img = style.icon.uri;
		}
		else
		{
			icon_img = GetDefaultStyleValue(subtype, 'icon_img');
		}
	}
	cz['billboard']['image'] = {'uri':icon_img};
	cz['name'] = name;
	cz['position'] = {};
	cz['position']['cartographicDegrees'] = [geojson['geometry']['coordinates'][0], geojson['geometry']['coordinates'][1], geojson['geometry']['coordinates'][2]];
	cz['point'] = {};
	if(style && style.color) v = style.color;
	else v = GetDefaultStyleValue(subtype, 'color')
	cz['point']['color'] = {'rgba':v};
	if(style && style.outline_color) v = style.outline_color;
	else v = GetDefaultStyleValue(subtype, 'outlineColor')
	cz['point']['outlineColor'] = {'rgba': v};
	if(style && style.outline_width) v = style.outline_width;
	else v = GetDefaultStyleValue(subtype, 'outlineWidth')
	cz['point']['outlineWidth'] = {'number': v};
	if(style && style.pixel_size) v = style.pixel_size;
	else v = GetDefaultStyleValue(subtype, 'pixelSize')
	cz['point']['pixelSize'] = {'number': v};
	cz['point']['show'] = {'boolean':true};
	cz['label'] = {};
	if(style && style.label_fill_color) v = style.label_fill_color;
	else v = GetDefaultStyleValue(subtype, 'labelFillColor')
	cz['label']['fillColor'] = {'rgba': v};
	cz['label']['horizontalOrigin'] = 'LEFT';
	cz['label']['verticalOrigin'] = 'BOTTOM';
	cz['label']['outlineColor'] = {'rgba': 1};
	cz['label']['pixelOffset'] = {'cartesian2':[20.0, 0.0]};
	if(style && style.label_scale) v = style.label_scale;
	else v = GetDefaultStyleValue(subtype, 'labelScale')
	cz['label']['scale'] = {'number': v};
	cz['label']['show'] = {'boolean':false};
	cz['label']['style'] = 'FILL';
	cz['label']['font'] = 'normal normal bold 32px arial';
	cz['label']['text'] = name;
	cz['description'] = '<!--HTML-->\r\n<p>' + name + '</p>';
	return cz;
}


function FilterModelList(str)
{
	try{
		$('#tower_info_model_list_selectable').selectable("destroy");
		$('#tower_info_model_list_selectable').empty();
	}catch(e)
	{
	}
	//console.log('str=' + str + ', len=' + g_models.length);
	for(var i in g_models)
	{
		if(str.length > 0)
		{
			if(g_models[i].toLowerCase().indexOf(str.toLowerCase())>-1)
			{
				$('#tower_info_model_list_selectable').append('<li class="ui-widget-content1">' + g_models[i] + '</li>');
			}
		}else{
			$('#tower_info_model_list_selectable').append('<li class="ui-widget-content1">' + g_models[i] + '</li>');
		}
	}
	$("#tower_info_model_list_selectable").selectable({
		selected: function( event, ui ) {
			var model_code_height = $(ui.selected).html();
			var url = GetModelUrl1(model_code_height);
			if(url.length>0)
			{
				var iframe = $('#tower_info_model').find('iframe');
				var obj = {};
				obj['url'] = '/' + url;
				//obj['data'] = {};
				//obj['tower_id'] = id;
				//obj['denomi_height'] = tower['properties']['denomi_height'];
				var json = encodeURIComponent(JSON.stringify(obj));
				iframe.attr('src', g_host + 'threejs/editor/index.html?' + json);
			}
			
			
			
			
		},
		selecting: function( event, ui ) {
			if( $(".ui-selected, .ui-selecting").length > 1){
                  $(ui.selecting).removeClass("ui-selecting");
            }
		}
	});
}

function LoadBorder(viewer, db_name, condition, callback)
{
	var cond = {'db':db_name, 'collection':'poi_border'};
	for(var k in condition)
	{
		cond[k] = condition[k];
	}
	MongoFind( cond, 
		function(data){
			if(data.length>0)
			{
				for(var i in data)
				{
					g_geojsons[data[i]['_id']] = data[i];
					//var dataSource = new Cesium.GeoJsonDataSource();
					//dataSource.load(data[0]);
					//dataSource.dsname = 'geojson';
					//viewer.dataSources.add(dataSource);
				}
				ReloadBorders(viewer, false);
			}
			ShowProgressBar(false);
			if(callback) callback();
	});
}

function RemoveBorders(viewer)
{
	var l = [];
	for(var k in g_borders)
	{
		l.push(k);
	}
	for(var i in l)
	{
		viewer.scene.primitives.remove(g_borders[l[i]]);
		delete g_borders[l[i]];
	}
}
function ReloadBorders(viewer, forcereload)
{
	var ellipsoid = viewer.scene.globe.ellipsoid;
	if(forcereload)
	{
		RemoveBorders(viewer);
	}
	var extent = {'west':179, 'east':-179, 'south':89, 'north':-89};
	for(var k in g_geojsons)
	{
		if(!forcereload)
		{
			if(g_borders[k])
			{
				continue;
			}
		}
		//console.log('load ' + k);
		var g = g_geojsons[k];
		if(g.properties.type && g.properties.type.indexOf('border')>-1)
		{
			var positions = [];
			//console.log(g.geometry.type);
			var arr;
			if(g.geometry.type === 'MultiPolygon')
				arr = g.geometry.coordinates[0][0];
			if(g.geometry.type === 'Polygon')
				arr = g.geometry.coordinates[0];
			//console.log(arr);
				
			for(var i=0; i < arr.length; i=i+10)
			{
				var x = arr[i][0],
					y = arr[i][1],
					z = 6000;
				if(g.properties.type === 'provinceborder')
				{
					z = 8000;
				}
				if(g.properties.type === 'cityborder')
				{
					z = 6000;
				}
				if(g.properties.type === 'countyborder')
				{
					z = 4000;
				}
				positions.push(ellipsoid.cartographicToCartesian(Cesium.Cartographic.fromDegrees(x, y, z)) );
				if (x < extent['west']) extent['west'] = x;
				if (x > extent['east']) extent['east'] = x;
				if (y < extent['south']) extent['south'] = y;
				if (y > extent['north']) extent['north'] = y;
				
			}
			//console.log(positions.length);
			if(positions.length > 20)
			{
				var color = Cesium.Color.fromCssColorString('rgba(0, 255, 0, 0.7)');
				if(g.properties.type === 'provinceborder')
				{
					color = Cesium.Color.fromCssColorString('rgba(255, 255, 0, 0.7)');
				}
				if(g.properties.type === 'cityborder')
				{
					color = Cesium.Color.fromCssColorString('rgba(255, 0, 0, 0.7)');
				}
				if(g.properties.type === 'countyborder')
				{
					color = Cesium.Color.fromCssColorString('rgba(0, 0, 255, 0.7)');
				}
				var wallInstance = new Cesium.GeometryInstance({
					id:k,
					geometry : new Cesium.WallGeometry({
						positions : positions,
					}),
					attributes : {
						//color : Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.fromRandom({alpha : 1.0}))
						//color : Cesium.ColorGeometryInstanceAttribute.fromColor()
						color : Cesium.ColorGeometryInstanceAttribute.fromColor(color)
					}
				});
				
				var primitive = new Cesium.Primitive({
					geometryInstances : wallInstance,
					appearance : new Cesium.PerInstanceColorAppearance({
						flat:true,
						//closed : true,
						translucent : true,
						renderState : {
							depthTest : {
								enabled : true
							}
						}
					})
				});
				viewer.scene.primitives.add(primitive);
				g_borders[k] = primitive;
			}
			
		}
	}
	FlyToExtent(viewer, extent['west'], extent['south'], extent['east'], extent['north']);
}

function LoadSegments(db_name, callback)
{
	var segs_cond = {'db':db_name, 'collection':'segments'};
	MongoFind( segs_cond, 
		function(data){
			g_segments = data;
			ShowProgressBar(false);
			if(callback) callback();
	});
}
function LoadModelsList(db_name, callback)
{
	var cond = {'db':db_name, 'collection':'-', 'action':'modelslist', 'data':{}};
	MongoFind( cond, 
		function(data){
			g_models = data;
			ShowProgressBar(false);
			if(callback) callback();
	});
}
function GetExtentByCzml()
{
	var ret;
	if(g_czmls)
	{
		ret = {'west':179, 'east':-179, 'south':89, 'north':-89};
		for(var k in g_czmls)
		{
			if(g_czmls[k]['polyline'])
			{
				var positions = g_czmls[k]['polyline']['positions']['cartographicDegrees'];
				//console.log(positions);
				for(var i in positions)
				{
					var p = positions[i];
					if (i%3==0 && p < ret['west']) ret['west'] = p;
					if (i%3==0 && p > ret['east']) ret['east'] = p;
					if (i%3==1 && p < ret['south']) ret['south'] = p;
					if (i%3==1 && p > ret['north']) ret['north'] = p;
				}
			}
			else if(g_czmls[k]['polygon'])
			{
				var positions = g_czmls[k]['polygon']['positions']['cartographicDegrees'];
				for(var i in positions)
				{
					var p = positions[i];
					if (i%3==0 && p < ret['west']) ret['west'] = p;
					if (i%3==0 && p > ret['east']) ret['east'] = p;
					if (i%3==1 && p < ret['south']) ret['south'] = p;
					if (i%3==1 && p > ret['north']) ret['north'] = p;
				}
			}
			else if(g_czmls[k]['position'])
			{
				var pos = g_czmls[k]['position']['cartographicDegrees'];
				if (pos[0] < ret['west']) ret['west'] = pos[0];
				if (pos[0] > ret['east']) ret['east'] = pos[0];
				if (pos[1] < ret['south']) ret['south'] = pos[1];
				if (pos[1] > ret['north']) ret['north'] = pos[1];
			}
		}
	}
	return ret;
}


function LoadCodeData(db_name, callback)
{
	var cond = {'db':db_name, 'collection':'codes'};
	MongoFind( cond, 
		function(data){
			g_codes = data[0];
			ShowProgressBar(false);
			if (callback) callback();
	});
}
function LoadLineData(db_name, callback)
{
	var line_cond = {'db':db_name, 'collection':'lines'};
	MongoFind( line_cond, 
		function(linedatas){
			for(var i in linedatas)
			{
				g_lines[linedatas[i]['_id']] = linedatas[i];
			}
			ShowProgressBar(false);
			if (callback) callback();
	});
}

function AddTerrainZOffset(geojson)
{
	var add_to_coord= function(coord)
	{
		if(coord instanceof Array && coord.length==3 && $.isNumeric(coord[0]))
		{
			coord[2] = coord[2] + g_terrain_z_offset;
		}
		else if(coord instanceof Array)
		{
			var l = [];
			for(var i in coord)
			{
				l.push(add_to_coord(coord[i]));
			}
			coord = l;
		}
		return coord;
	}
	if(geojson['geometry'] && geojson['geometry']['coordinates'])
	{
		geojson['geometry']['coordinates'] = add_to_coord(geojson['geometry']['coordinates']);
	}
	return geojson;
}

function LoadTowerByLineName(viewer, db_name,  name,  callback)
{
	var geo_cond = {'db':db_name, 'collection':'mongo_get_towers_by_line_name', 'properties.name':name};
	//var ext_cond = {'db':db_name, 'collection':'mongo_get_towers_by_line_name','get_extext':true, 'properties.name':name};
	ShowProgressBar(true, 670, 200, '载入中', '正在载入[' + name + ']数据，请稍候...');
	MongoFind( geo_cond, 
		function(data){
			//console.log(data);
			ShowProgressBar(false);
			for(var i in data)
			{
				var _id = data[i]['_id'];
				var geojson = data[i];
				//geojson = AddZValueByCesium(viewer, geojson, g_zaware);
				if(!g_geojsons[_id])
				{
					g_geojsons[_id] = AddTerrainZOffset(geojson);
				}
				if(!g_czmls[_id])
				{
					g_czmls[_id] = CreateCzmlFromGeojson(g_geojsons[_id]);
				}
			}
			//ReloadCzmlDataSource(viewer, g_zaware);
			if(callback) callback();
	});
}

function LoadLineByLineName(viewer, db_name, name, callback)
{
	var get_line_id = function(name){
		var ret;
		for(var k in g_lines)
		{
			if(g_lines[k]['properties']['name'] === name)
			{
				ret = k;
				break;
			}
		}
		return ret;
	};
	var _id = get_line_id(name);
	//console.log(g_lines);
	var ellipsoid = viewer.scene.globe.ellipsoid;
	
	if(!_id)
	{
		console.log(name + " does not exist");
		return;
	}
	var cond = {'db':db_name, 'collection':'get_line_geojson', '_id':_id};
	MongoFind(cond, function(data){
		if(data.length>0)
		{
			//console.log(data[0]);
			if(!g_geojsons[_id])
			{
				g_geojsons[_id] = AddTerrainZOffset(data[0]);
			}
			if(!g_czmls[_id])
			{
				//console.log(g_geojsons[_id]);
				g_czmls[_id] = CreateCzmlFromGeojson(g_geojsons[_id]);
				//console.log(g_czmls[_id]);
			}
			ReloadCzmlDataSource(viewer, g_zaware);
		}
		if(callback) callback();
	});
}

function GetVertexPositionsByGeojsonPolyline(geometry, height)
{
	var ret = [];
	var coordinates = geometry.coordinates;
	if(geometry.type === 'Polygon')
	{
		coordinates = geometry.coordinates[0];
	}
	for(var i in coordinates)
	{
		var coord = coordinates[i];
		ret.push(coord[0]);
		ret.push(coord[1]);
		if(height) 
			ret.push(coord[2] + height);
		else
			ret.push(coord[2]);
	}
	return ret;
}

function GetVertexPositionsByTowerPairs(towers_pair)
{
	var ret = [];
	var st = SortTowersByTowersPair(towers_pair);
	for(var i in st)
	{
		var _id = st[i];
		if(g_czmls[_id])
		{
			ret.push(g_czmls[_id]['position']['cartographicDegrees'][0]);
			ret.push(g_czmls[_id]['position']['cartographicDegrees'][1]);
			ret.push(g_czmls[_id]['position']['cartographicDegrees'][2]);
		}
	}
	return ret;
}


function GetIndexOfDataSourcesByName(viewer, name)
{
	var ret = -1;
	for(var i = 0; i < viewer.dataSources.length; i++)
	{
		var ds = viewer.dataSources.get(i);
		//console.log('ds.name=' + ds.name);
		if(ds.name == name)
		{
			viewer.dataSources.remove(ds);
			ret = i;
			break;
		}
	}
	return ret;
}
function GetDataSourcesByName(viewer, name)
{
	var ret;
	for(var i = 0; i < viewer.dataSources.length; i++)
	{
		var ds = viewer.dataSources.get(i);
		if(ds.name == name)
		{
			ret = ds;
			break;
		}
	}
	return ret;
}
function ReloadCzmlDataSource(viewer, z_aware, forcereload)
{
	
	var get_label_show_opt = function(){
		var r = {};
		$('input[id^=chb_show_label_]').each(function(){
			var t = $(this).attr('id').replace('chb_show_label_', '');
			r[t] = false;
			if($(this).is(':checked')) r[t] = true;
		});
		return r;
	};
	
	var ellipsoid = viewer.scene.globe.ellipsoid;
	var arr = [];
	var pos;
	//console.log('z_aware=' + z_aware);
	arr.push({"id":"document", "version":"1.0"});
	for(var k in g_czmls)
	{
		var obj =  $.extend(true, {}, g_czmls[k]);
		if(!z_aware)
		{
			if(obj['position'])
			{
				obj['position']['cartographicDegrees'] = [
					obj['position']['cartographicDegrees'][0],  
					obj['position']['cartographicDegrees'][1], 
					0
				];
			}
			if(obj['polyline'] && obj['polyline']['positions'])
			{
				for(var i in obj['polyline']['positions']['cartographicDegrees'])
				{
					if(i % 3 == 2)
					{
						obj['polyline']['positions']['cartographicDegrees'][i] = 0;
					}
				}
			}
			if(obj['polygon'] && obj['polygon']['positions'])
			{
				for(var i in obj['polygon']['positions']['cartographicDegrees'])
				{
					if(i % 3 == 2)
					{
						obj['polygon']['positions']['cartographicDegrees'][i] = 0;
					}
				}
			}
			if(obj['polygon'] && obj['polygon']['extrudedHeight'])
			{
				obj['polygon']['extrudedHeight'] = 0;
			}
		
		}else
		{
			//if(obj['position'] && obj['position']['cartographicDegrees'][2] == 0)
			//{
				//var height = 0;
				//var carto = Cesium.Cartographic.fromDegrees(
					//obj['position']['cartographicDegrees'][0],  
					//obj['position']['cartographicDegrees'][1]
					//);
				//var h = viewer.scene.globe.getHeight(carto);
				//console.log(h);
				//if(h && h>0) height = h;
				//obj['position']['cartographicDegrees'] = [
					//obj['position']['cartographicDegrees'][0],  
					//obj['position']['cartographicDegrees'][1], 
					//height
				//];
				//g_czmls[k]['position']['cartographicDegrees'] = obj['position']['cartographicDegrees'];
			//}
			//if(obj['polyline'] && obj['polyline']['positions'] )
			//{
				//for(var i=2; i<obj['polyline']['positions']['cartographicDegrees'].length; i=i+3)
				//{
					//if(obj['polyline']['positions']['cartographicDegrees'][i] == 0)
					//{
						//var height = 0;
						//var h = viewer.scene.globe.getHeight(Cesium.Cartographic.fromDegrees(
								//obj['polyline']['positions']['cartographicDegrees'][i-2],  
								//obj['polyline']['positions']['cartographicDegrees'][i-1]
							//));
						//if(h && h>0) height = h;
						//obj['polyline']['positions']['cartographicDegrees'][i] = height;
						//g_czmls[k]['polyline']['positions']['cartographicDegrees'][i] = height;
					//}
				//}
			//}
		}
		var opt = get_label_show_opt();
		for(var k in opt)
		{
			if(k===obj['webgis_type'])
			{
				if(opt[k] === true)
					obj['label']['show'] = {'boolean':true};
				if(opt[k] === false)
					obj['label']['show'] = {'boolean':false};
			}
		}
		//}else
		//{
			//obj['label']['show'] = {'boolean':false};
		//}
		arr.push(obj);
		if(viewer.selectedEntity)
		{
			if(obj['position'] && obj['id'] === viewer.selectedEntity.id)
			{
				pos = obj['position']['cartographicDegrees'];
				//var h = viewer.scene.globe.getHeight(Cesium.Cartographic.fromDegrees(pos[0],  pos[1]));
				//if(h && h>0) pos[2] = h;
				//console.log(pos);
			}
		}
	}
	if(g_czmls === {})
	{
		viewer.selectedEntity = undefined;
		g_selected_obj = undefined;
	}
	var dataSource = GetDataSourcesByName(viewer, 'czml');
	if(!dataSource)
	{
		dataSource = new Cesium.CzmlDataSource('czml');
		viewer.dataSources.add(dataSource);
	}
	dataSource.process(arr);
	if(forcereload)
	{
		console.log('czml forcereload');
		viewer.dataSources.remove(dataSource, true) ;
		dataSource = new Cesium.CzmlDataSource('czml');
		dataSource.load(arr);
		viewer.dataSources.add(dataSource);
	}
	
	
	//if(dataSource)
	//{
		//console.log(arr.length-1);
		//console.log(dataSource.entities.entities.length);
		//if(arr.length-1 === dataSource.entities.entities.length)
		//{
			//console.log('no change');
			//dataSource.process(arr);
		//}else
		//{
			//console.log('changed');
			//dataSource.load(arr);
		//}
	//}else
	//{
		//dataSource = new Cesium.CzmlDataSource('czml');
		////console.log(dataSource.name);
		//dataSource.load(arr);
		////dataSource.dsname = 'czml';
		//viewer.dataSources.add(dataSource);
	//}
	if(viewer.selectedEntity && pos)
	{
		viewer.selectedEntity.position._value = ellipsoid.cartographicToCartesian(Cesium.Cartographic.fromDegrees(pos[0], pos[1], pos[2]));
	}
}
function LookAtTarget(viewer, id, zoom_factor)
{
	var scene = viewer.scene;
	//scene.camera.controller.lookAt(scene.camera.position, target, scene.camera.up);
	var ellipsoid = scene.globe.ellipsoid;
	
	if(g_geojsons[id])
	{
		var g = g_geojsons[id];
		var x = g['geometry']['coordinates'][0];
		var y = g['geometry']['coordinates'][1];
		var z = g['geometry']['coordinates'][2];
		
		if(zoom_factor)
			FlyToPoint(viewer, x, y, z, zoom_factor, 4000);
		else
			FlyToPoint(viewer, x, y, z, 1.09, 4000);
	}
}
function LookAtTargetExtent(viewer, id, dx, dy)
{
	var scene = viewer.scene;
	var ellipsoid = scene.globe.ellipsoid;
	if(g_geojsons[id])
	{
		var tower = g_geojsons[id];
		var x = tower['geometry']['coordinates'][0];
		var y = tower['geometry']['coordinates'][1];
		var west = Cesium.Math.toRadians(x - dx);
		var south = Cesium.Math.toRadians(y - dy);
		var east = Cesium.Math.toRadians(x + dx);
		var north = Cesium.Math.toRadians(y + dy);
		var extent = new Cesium.Extent(west, south, east, north);
		//scene.camera.controller.viewExtent(extent, ellipsoid);
		FlyToExtent(viewer, west, south, east, north);
	}
}
function ViewExtentByPos(viewer, lng, lat,  dx, dy)
{
	var scene = viewer.scene;
	var ellipsoid = scene.globe.ellipsoid;
	var west = Cesium.Math.toRadians(lng - dx);
	var south = Cesium.Math.toRadians(lat - dy);
	var east = Cesium.Math.toRadians(lng + dx);
	var north = Cesium.Math.toRadians(lat + dy);
	var extent = new Cesium.Extent(west, south, east, north);
	//scene.camera.controller.viewExtent(extent, ellipsoid);
	scene.camera.controller.viewExtent(extent, ellipsoid);

			
}


function FlyToPoint(viewer, x, y, z, factor, duration)
{
	var scene = viewer.scene;
	var ellipsoid = scene.globe.ellipsoid;
	var destination = Cesium.Cartographic.fromDegrees(x,  y,  z * factor);
	//var flight = Cesium.CameraFlightPath.createAnimationCartographic(scene, {
		//destination : destination,
		//duration	:duration
	//});
	//scene.animations.add(flight);
	
	scene.camera.flyTo({
        destination : ellipsoid.cartographicToCartesian(destination),
		duration	:duration/1000.0
    });	
	
	
}

function FlyToPointCart3(viewer, cartopos, duration)
{
	var scene = viewer.scene;
	var ellipsoid = scene.globe.ellipsoid;
	//var flight = Cesium.CameraFlightPath.createAnimationCartographic(scene, {
		//destination	:	pos,
		//duration	:	duration
		////up			:	scene.camera.up,
		////direction	:	scene.camera.direction
	//});
	//scene.animations.add(flight);
	scene.camera.flyTo({
        destination : ellipsoid.cartographicToCartesian(cartopos),
		duration	:duration/1000.0
    });	
}

function FlyToExtent(viewer, west, south, east, north)
{
	var scene = viewer.scene;
	var extent = Cesium.Rectangle.fromDegrees(west, south, east, north);
	//var flight = Cesium.CameraFlightPath.createAnimationRectangle(scene, {
		//destination : extent
	//});
	//scene.animations.add(flight);
	
	scene.camera.flyToRectangle({
        destination : extent
    });	
	
	
}

function GetTowerInfoByTowerId(id)
{
	var ret = null;
	if(g_geojsons[id])
	{
		ret = g_geojsons[id];
	}
	return ret;
}

function LoadTowerModelByTower(viewer, tower)
{
	var url_exist = function(url)
	{
		var http = new XMLHttpRequest();
		http.open('HEAD', url, false);
		http.send();
		return http.status!=404;
	};
	var scene = viewer.scene;
	var ellipsoid = scene.globe.ellipsoid;
	
	if(tower)
	{
		var id = tower['_id'];
		if(!g_gltf_models[id])
		{
			if(tower['properties']['model']['model_code_height'])
			{
				var lng = parseFloat($('#form_tower_info_base').webgisform('get','lng').val()),
					lat = parseFloat($('#form_tower_info_base').webgisform('get','lat').val()),
					height = parseFloat($('#form_tower_info_base').webgisform('get','alt').val()),
					rotate = parseFloat($('#form_tower_info_base').webgisform('get','rotate').val());
				if(!g_zaware)
				{
					height = 0;
				}else
				{
					//var h = viewer.scene.globe.getHeight(Cesium.Cartographic.fromDegrees(lng,  lat));
					//if(h && h>0) 
					//{
						//height = h;
						//$('#form_tower_info_base').webgisform('get','alt').val(height);
					//}
				}
				if($.isNumeric(lng) && $.isNumeric(lat) && $.isNumeric(height) && $.isNumeric(rotate))
				{
					var url = GetModelUrl(tower['properties']['model']['model_code_height']);
					if(url_exist(url))
					{
						var model = CreateTowerModel(
							viewer, 
							url, 
							lng,  
							lat, 
							height ,  
							rotate,
							10
						);
						if(model)
						{
							g_gltf_models[id] = model;
							console.log("load model for [" + id + "]");
						}
						//g_czmls[id]['billboard']['show'] = {'boolean':false};
						//ReloadCzmlDataSource(viewer, g_zaware);
					}else
					{
						console.log("model " + url + " does not exist");
						g_czmls[id]['billboard']['show'] = {'boolean':true};
						//if(g_czmls[id])
						//{
							//g_czmls[id]['billboard']['image'] = {'uri':g_style_point_mapping['point_tower']['icon_img']};
						ReloadCzmlDataSource(viewer, g_zaware);
						//}
					}
				}
			}
		}
		else
		{
		}
	}
}



function GetNextTowerModelData(ids)
{
	var ret = [];
	for(var i in ids)
	{
		var id = ids[i];
		if(g_geojsons[id])
		{
			var tower = g_geojsons[id];
			ret.push(tower['properties']['model']);
		}
	}
	return ret;
}
function GetNextModelUrl(ids)
{
	var ret = [];
	for(var i in ids)
	{
		var id = ids[i];
		if(g_geojsons[id])
		{
			var tower = g_geojsons[id];
			var url = GetModelUrl1(tower['properties']['model']['model_code_height']);
			if(url.length>0)
			{
				ret.push(url);
			}
		}
		
	}
	return ret;
}

function GetModelUrl(model_code_height)
{
	if(!model_code_height)
	{
		return '';
	}
	return g_host + "gltf/" + model_code_height + ".gltf" ;
}

function GetModelUrl1(model_code_height)
{
	if(!model_code_height)
	{
		return '';
	}
	return g_host + "gltf1/" + model_code_height + ".json" ;
}

function CreateTowerModel(viewer, modelurl,  lng,  lat,  height, rotate, scale) 
{
	var scene = viewer.scene;
	var ellipsoid = scene.globe.ellipsoid;
	if(modelurl.length==0)
	{
		return null;
	}
	height = Cesium.defaultValue(height, 0.0);
	var cart3 = ellipsoid.cartographicToCartesian(Cesium.Cartographic.fromDegrees(lng, lat, height));
	var modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(cart3);
	var quat = Cesium.Quaternion.fromAxisAngle(Cesium.Cartesian3.UNIT_Z, Cesium.Math.toRadians(rotate - 90));
	var mat3 = Cesium.Matrix3.fromQuaternion(quat);
	var mat4 = Cesium.Matrix4.fromRotationTranslation(mat3, Cesium.Cartesian3.ZERO);
	var m = Cesium.Matrix4.multiplyTransformation(modelMatrix, mat4, mat4);
//console.log(modelurl);	
//console.log(m);	
	var model = scene.primitives.add(Cesium.Model.fromGltf({
		url : modelurl,
		modelMatrix : m,
		scale:scale,
		asynchronous:false
	}));
	
	model.readyToRender.addEventListener(function(model) {
		model.activeAnimations.addAll({
			speedup : 0.5,
			loop : Cesium.ModelAnimationLoop.REPEAT
		});

		//// Zoom to model
		//var worldBoundingSphere = model.computeWorldBoundingSphere();
		//var center = worldBoundingSphere.center;
		//var transform = Cesium.Transforms.eastNorthUpToFixedFrame(center);
		//var camera = scene.camera;
		//camera.transform = transform;
		//camera.controller.constrainedAxis = Cesium.Cartesian3.UNIT_Z;
		//var controller = scene.screenSpaceCameraController;
		//controller.ellipsoid = Cesium.Ellipsoid.UNIT_SPHERE;
		//controller.enableTilt = true;
		//var r = 1.25 * Math.max(worldBoundingSphere.radius, camera.frustum.near);
		//controller.minimumZoomDistance = r * 0.25;
		//camera.controller.lookAt(new Cesium.Cartesian3(r, r, r), Cesium.Cartesian3.ZERO, Cesium.Cartesian3.UNIT_Z);
	});
	return model;
}


function TowerInfoMixin(viewer) 
{
	var scene = viewer.scene;
	var ellipsoid = scene.globe.ellipsoid;
	if (!Cesium.defined(viewer)) {
		throw new Cesium.DeveloperError('viewer is required.');
	}
	if (viewer.hasOwnProperty('trackedEntity')) {
		throw new Cesium.DeveloperError('trackedEntity is already defined by another mixin.');
	}
	if (viewer.hasOwnProperty('selectedEntity')) {
		throw new Cesium.DeveloperError('selectedEntity is already defined by another mixin.');
	}

	var infoBox;// = viewer.infoBox;
	var infoBoxViewModel = Cesium.defined(infoBox) ? infoBox.viewModel : undefined;

	var selectionIndicator = viewer.selectionIndicator;
	var selectionIndicatorViewModel = Cesium.defined(selectionIndicator) ? selectionIndicator.viewModel : undefined;
	var enableInfoOrSelection = Cesium.defined(infoBox) || Cesium.defined(selectionIndicator);
	//enableInfoOrSelection = false;
	var eventHelper = new Cesium.EventHelper();
	var entityView;

	function trackSelectedEntity() {
		viewer.trackedEntity = viewer.selectedEntity;
		var id = viewer.trackedEntity.id;
		//console.log('track id=' + id);
		LookAtTarget(viewer, id);
	}

	function clearTrackedEntity() {
		viewer.trackedEntity = undefined;
	}

	function clearSelectedEntity() {
		viewer.selectedEntity = undefined;
	}

	function clearObjects() {
		viewer.trackedEntity = undefined;
		viewer.selectedEntity = undefined;
	}

	if (Cesium.defined(infoBoxViewModel)) {
		eventHelper.add(infoBoxViewModel.cameraClicked, trackSelectedEntity);
		eventHelper.add(infoBoxViewModel.closeClicked, clearSelectedEntity);
	}

	var scratchVertexPositions;
	var scratchBoundingSphere;

	function onTick(clock) {
		var time = clock.currentTime;
		if (Cesium.defined(entityView)) {
			entityView.update(time);
		}

		var selectedEntity = viewer.selectedEntity;
		if(selectedEntity && selectedEntity.isAvailable)
		{
			var showSelection = Cesium.defined(selectedEntity) && enableInfoOrSelection;
			if (showSelection) {
				var oldPosition = Cesium.defined(selectionIndicatorViewModel) ? selectionIndicatorViewModel.position : undefined;
				var position;
				var enableCamera = false;
	
				if (selectedEntity.isAvailable(time)) {
					if (Cesium.defined(selectedEntity.position)) {
						position = selectedEntity.position.getValue(time, oldPosition);
						enableCamera = Cesium.defined(position) && (viewer.trackedEntity !== viewer.selectedEntity);
					} else if (Cesium.defined(selectedEntity.positions)) {
						scratchVertexPositions = selectedEntity.positions.getValue(time, scratchVertexPositions);
						scratchBoundingSphere = Cesium.BoundingSphere.fromPoints(scratchVertexPositions, scratchBoundingSphere);
						position = scratchBoundingSphere.center;
						// Can't track scratch positions: "enableCamera" is false.
					}
					// else "position" is undefined and "enableCamera" is false.
				}
				// else "position" is undefined and "enableCamera" is false.
	
				if (Cesium.defined(selectionIndicatorViewModel)) {
					selectionIndicatorViewModel.position = position;
				}
	
				if (Cesium.defined(infoBoxViewModel)) {
					infoBoxViewModel.enableCamera = enableCamera;
					infoBoxViewModel.isCameraTracking = (viewer.trackedEntity === viewer.selectedEntity);
	
					//if (Cesium.defined(selectedEntity.description)) {
						//infoBoxViewModel.descriptionRawHtml = Cesium.defaultValue(selectedEntity.description.getValue(time), '');
					//} else {
						//infoBoxViewModel.descriptionRawHtml = '';
					//}
				}
			}
	
			if (Cesium.defined(selectionIndicatorViewModel)) {
				selectionIndicatorViewModel.showSelection = showSelection;
				selectionIndicatorViewModel.update();
			}
	
			if (Cesium.defined(infoBoxViewModel)) {
				infoBoxViewModel.showInfo = showSelection;
			}
		}else
		{
			selectionIndicatorViewModel.showSelection = false;
			selectionIndicatorViewModel.update();
		}
	}
	eventHelper.add(viewer.clock.onTick, onTick);

//----test pick only-----
	//var labels = new Cesium.LabelCollection();
	//label = labels.add();
	//viewer.scene.primitives.add(labels);
//------------------
	function pickTrackedEntity(e) {
		var picked = viewer.scene.pick(e.position);
		var ellipsoid = viewer.scene.globe.ellipsoid;
		var cartesian = viewer.scene.camera.pickEllipsoid(e.position, ellipsoid);
		if (cartesian) {
			//var cartographic = ellipsoid.cartesianToCartographic(cartesian);
			//var lng = Cesium.Math.toDegrees(cartographic.longitude).toFixed(7),
				//lat = Cesium.Math.toDegrees(cartographic.latitude).toFixed(7);
			//var text = '(' + lng + ',' + lat + ')';
			//label.show = true;
			//label.text = text;
			//label.position = cartesian;
		}
		
		
		if (Cesium.defined(picked)) {
			var id = Cesium.defaultValue(picked.id, picked.primitive.id);
			//console.log(id);
			//console.log(typeof id);
			if (id instanceof Cesium.Entity) {
				return id;
			}
			
			//if (picked.primitive && picked.primitive instanceof Cesium.Primitive) {
			if (picked.primitive) {
				return picked;
			}
		}
	}

	function trackObject(trackedEntity) {
		if (Cesium.defined(trackedEntity) && Cesium.defined(trackedEntity.position)) {
			viewer.trackedEntity = trackedEntity;
		}
	}

	function pickAndTrackObject(e) {
		var trackedEntity = pickTrackedEntity(e);
		if (Cesium.defined(trackedEntity)) 
		{
			if (trackedEntity.primitive && trackedEntity.primitive instanceof Cesium.Primitive)
			{
			}
			else
			{
				trackObject(trackedEntity);
				var id = trackedEntity.id;
				LookAtTarget(viewer, id);
			}
		}
	}

	function moveOverObject(e) {
		var picked = viewer.scene.pick(e.endPosition);
		if (Cesium.defined(g_selected_obj) && Cesium.defined(picked) && Cesium.defined(picked.id) && picked.id === g_selected_obj) 
		{
			var id = g_selected_obj.id;
			if(g_geojsons[id] && g_geojsons[id]['properties']['name'])
			{
				ShowGeoTip(id, e.endPosition, g_geojsons[id]['properties']['name']);
			}else 
			{
				ShowGeoTip(false);
			}
		}else 
		{
			ShowGeoTip(false);
		} 
	}
	
	function pickAndSelectObject(e) {
		var clearselcolor = function(){
			if(g_prev_selected_obj && g_prev_selected_obj.primitive && g_primitive_material_unselect)
			{
				g_prev_selected_obj.primitive.material = g_primitive_material_unselect;
			}
			if(g_prev_selected_obj && g_prev_selected_obj.polyline && g_polyline_material_unselect)
			{
				g_prev_selected_obj.polyline.material = g_polyline_material_unselect;
			}
			if(g_prev_selected_obj && g_prev_selected_obj.polygon && g_polygon_material_unselect)
			{
				g_prev_selected_obj.polygon.material = g_polygon_material_unselect;
			}
		};
		clearselcolor();
		viewer.selectedEntity = pickTrackedEntity(e);
		
		$('#btn_edge_save').attr('disabled','disabled');
		if (Cesium.defined(viewer.selectedEntity)) 
		{
			g_prev_selected_obj = g_selected_obj;
			g_selected_obj = viewer.selectedEntity;
			var id = g_selected_obj.id;
			if (id && id.properties && id.properties.webgis_type === 'edge_dn')
			{
				clearselcolor();
				g_primitive_material_unselect =  g_selected_obj.primitive.material;
				if(g_primitive_material_unselect)
				{
					g_selected_obj.primitive.material = 
					//Cesium.Material.fromType('PolylineOutline',{
						//color:	g_primitive_material_unselect.uniforms.color,
						//outlineColor : Cesium.Color.fromCssColorString('rgba(0, 255, 0, 1.0)'),
						//outlineWidth: 1.0
					//});
					//Cesium.Material.fromType('Color', {
						//color : Cesium.Color.fromCssColorString('rgba(0, 255, 0, 1.0)')
					//});
					Cesium.Material.fromType('PolylineArrow', {
						color : Cesium.Color.fromCssColorString('rgba(0, 255, 0, 1.0)')
					});
					
					
				}
			}
			else if (g_selected_obj.polyline)
			{
				if(g_prev_selected_obj===undefined || g_prev_selected_obj.id != id)
				{
					clearselcolor();
					console.log('selected polyline id=' + id);
					g_polyline_material_unselect = g_selected_obj.polyline.material;
					g_selected_obj.polyline.material = Cesium.ColorMaterialProperty.fromColor(Cesium.Color.fromCssColorString('rgba(0, 255, 255, 1.0)'));
				}
			}
			else if (g_selected_obj.polygon)
			{
				if(g_prev_selected_obj===undefined || g_prev_selected_obj.id != id)
				{
					clearselcolor();
					console.log('selected polygon id=' + id);
					g_polygon_material_unselect = g_selected_obj.polygon.material;
					g_selected_obj.polygon.material = Cesium.ColorMaterialProperty.fromColor(Cesium.Color.fromCssColorString('rgba(0, 255, 0, 0.3)'));
				}
			}
			else if (g_selected_obj.point)
			{
				clearselcolor();
				//console.log('selected marker id=' + id);
				if(g_prev_selected_obj && g_prev_selected_obj.id)
				{
					//console.log('prev selected id=' + g_prev_selected_obj.id);
				}
				if(g_czmls[id] && g_czmls[id]['webgis_type'] === 'point_dn')
				{
					
					if(!g_dn_connect_mode)
					{
						$.jGrowl("按CTRL键切换连接模式开关,选择下一个配电网节点,将依次连接这两个节点", { 
							life: 2000,
							position: 'bottom-right', //top-left, top-right, bottom-left, bottom-right, center
							theme: 'bubblestylesuccess',
							glue:'before'
						});
					}
				}
				if(CheckIsTower(id) && (g_prev_selected_obj===undefined || g_prev_selected_obj.id != id))
				{
					if(g_prev_selected_obj && g_prev_selected_obj.id)
					{
						if(CheckTowerInfoModified())
						{
							
							ShowConfirm(null,500, 200,
								'保存确认',
								'检测到数据被修改，确认保存吗? 确认的话数据将会提交到服务器上，以便所有人都能看到修改的结果。',
								function(){
									SaveTower();
									ShowTowerInfo(viewer, id);
								},
								function(){
									ShowTowerInfo(viewer, id);
								}
							);
							
						}else{
							ShowTowerInfo(viewer, id);
						}
					}
					else{
						ShowTowerInfo(viewer, id);
					}
				}
				if(g_czmls[id] && g_czmls[id]['webgis_type'] === 'point_dn' && g_prev_selected_obj && g_czmls[g_prev_selected_obj.id] && g_czmls[g_prev_selected_obj.id]['webgis_type'] === 'point_dn')
				{
					if(g_dn_connect_mode && !CheckSegmentsExist(g_prev_selected_obj, g_selected_obj))
					{
						var ring = CheckSegmentsRing(g_prev_selected_obj, g_selected_obj);
						if(ring)
						{
							$.jGrowl("不能形成环路",{
								life: 2000,
								position: 'bottom-right', //top-left, top-right, bottom-left, bottom-right, center
								theme: 'bubblestylefail',
								glue:'before'
							});
							
						}else
						{
							$('#btn_edge_save').removeAttr('disabled');
							$('#div_edge_instruction').html(g_geojsons[g_prev_selected_obj.id].properties.name + '->' + g_geojsons[id].properties.name);
							DrawSegmentsBetweenTwoDNNode(viewer, g_prev_selected_obj.id, id, true);
						}
					}
				}
			}
		}
		else{
			clearselcolor();
			ShowGeoTip(false);
			g_prev_selected_obj = g_selected_obj;			
			g_selected_obj = undefined;
		}
	}

	//event after terrain change
	$('.cesium-baseLayerPicker-choices').on('click', function(e){
		var db = $(e.target).parent().parent().attr('data-bind');
		if(db == 'foreach: terrainProviderViewModels')
		{
			if($(e.target).parent().attr('title') == 'no-terrain')
			{
				//console.log('no terrain');
				g_zaware = false;
			}
			else
			{
				g_zaware = true;
				//console.log('yes terrain');			
			}
			ReloadCzmlDataSource(viewer, g_zaware, true);
			ReloadModelPosition(viewer);
		}
	});
	//console.log(viewer.baseLayerPicker.viewModel.selectedImagery.command.afterExecute);
	//eventHelper.add(viewer.scene.globe.imageryLayers.layerShownOrHidden, function(commandInfo){
		//console.log(commandInfo);
	//});


	if (Cesium.defined(viewer.homeButton)) {
		eventHelper.add(viewer.homeButton.viewModel.command.beforeExecute, function(commandInfo){
			clearTrackedEntity();
		});
		eventHelper.add(viewer.homeButton.viewModel.command.afterExecute, function(commandInfo){
			var extent = GetExtentByCzml();
			FlyToExtent(viewer, extent['west'], extent['south'], extent['east'], extent['north']);
		});
	}

	if (Cesium.defined(viewer.geocoder)) {
		eventHelper.add(viewer.geocoder.viewModel.search.beforeExecute, clearObjects);
	}

	function ClearTrackedObj(viewer)
	{
		var vm = viewer.homeButton.viewModel;
		var transitioner = vm._transitioner;
		var ellipsoid = viewer.scene.globe.ellipsoid;
		//var ellipsoid = vm._ellipsoid;
		var scene = viewer.scene;
        var mode = scene.mode;
        var controller = scene.screenSpaceCameraController;
		var flightDuration = 1;

        controller.ellipsoid = ellipsoid;
        controller.columbusViewMode = Cesium.CameraColumbusViewMode.FREE;

        var context = scene.context;
        if (Cesium.defined(transitioner) && mode === Cesium.SceneMode.MORPHING) {
            transitioner.completeMorph();
        }
        var flight;
        var description;

        if (mode === Cesium.SceneMode.SCENE2D) {
            //description = {
                //destination : Cesium.Extent.MAX_VALUE,
                //duration : flightDuration/1000.0,
                //endReferenceFrame : new Cesium.Matrix4(0, 0, 1, 0,
                                                //1, 0, 0, 0,
                                                //0, 1, 0, 0,
                                                //0, 0, 0, 1)
            //};
            //flight = Cesium.CameraFlightPath.createAnimationExtent(scene, description);
            //scene.animations.add(flight);
			scene.camera.flyTo({
                destination : Cesium.Extent.MAX_VALUE,
                duration : flightDuration/1000.0,
                endReferenceFrame : new Cesium.Matrix4( 0, 0, 1, 0,
														1, 0, 0, 0,
														0, 1, 0, 0,
														0, 0, 0, 1)
			});			
        } else if (mode === Cesium.SceneMode.SCENE3D) {
            var defaultCamera = new Cesium.Camera(context);
            //description = {
                //destination : defaultCamera.position,
                //duration : flightDuration/1000.0,
                //up : defaultCamera.up,
                //direction : defaultCamera.direction,
                //endReferenceFrame : Cesium.Matrix4.IDENTITY
            //};
            //flight = Cesium.CameraFlightPath.createAnimation(scene, description);
            //scene.animations.add(flight);
			
			scene.camera.flyTo({
                destination : defaultCamera.position,
                duration : flightDuration/1000.0,
                up : defaultCamera.up,
                direction : defaultCamera.direction,
                endReferenceFrame : Cesium.Matrix4.IDENTITY
			});			
			
        } else if (mode === Cesium.SceneMode.COLUMBUS_VIEW) {
            //var maxRadii = ellipsoid.maximumRadius;
            //var position = Cesium.Cartesian3.multiplyByScalar(Cesium.Cartesian3.normalize(new Cesium.Cartesian3(0.0, -1.0, 1.0)), 5.0 * maxRadii);
            //var direction = Cesium.Cartesian3.normalize(Cesium.Cartesian3.subtract(Cesium.Cartesian3.ZERO, position));
            //var right = Cesium.Cartesian3.cross(direction, Cesium.Cartesian3.UNIT_Z);
            //var up = Cesium.Cartesian3.cross(right, direction);

            //description = {
                //destination : position,
                //duration : flightDuration/1000.0,
                //up : up,
                //direction : direction,
                //endReferenceFrame : new Cesium.Matrix4(0, 0, 1, 0,
                                                //1, 0, 0, 0,
                                                //0, 1, 0, 0,
                                                //0, 0, 0, 1)
            //};

            //flight = Cesium.CameraFlightPath.createAnimation(scene, description);
            //scene.animations.add(flight);
			scene.camera.flyTo({
                destination : position,
                duration : flightDuration/1000.0,
                up : up,
                direction : direction,
                endReferenceFrame : new Cesium.Matrix4( 0, 0, 1, 0,
														1, 0, 0, 0,
														0, 1, 0, 0,
														0, 0, 0, 1)
			});			
        }
	}

	function onDynamicCollectionChanged(collection, added, removed) {
		var length = removed.length;
		for (var i = 0; i < length; i++) {
			var removedObject = removed[i];
			if (viewer.trackedEntity === removedObject) {
				//viewer.homeButton.viewModel.command();
			}
			if (viewer.selectedEntity === removedObject) {
				//viewer.selectedEntity = undefined;
			}
		}
	}

	function dataSourceAdded(dataSourceCollection, dataSource) {
		var entities = dataSource.entities ;//.getDynamicObjectCollection();
		entities.collectionChanged.addEventListener(onDynamicCollectionChanged);
	}

	function dataSourceRemoved(dataSourceCollection, dataSource) {
		var entities = dataSource.entities ;//.getDynamicObjectCollection();
		entities.collectionChanged.removeEventListener(onDynamicCollectionChanged);

		if (Cesium.defined(viewer.trackedEntity)) {
			if (entities.getById(viewer.trackedEntity.id) === viewer.trackedEntity) {
				//viewer.homeButton.viewModel.command();
			}
		}

		if (Cesium.defined(viewer.selectedEntity)) {
			if (entities.getById(viewer.selectedEntity.id) === viewer.selectedEntity) {
				//viewer.selectedEntity = undefined;
			}
		}
	}

	var dataSources = viewer.dataSources;
	var dataSourceLength = dataSources.length;
	for (var i = 0; i < dataSourceLength; i++) {
		dataSourceAdded(dataSources, dataSources.get(i));
	}

	eventHelper.add(viewer.dataSources.dataSourceAdded, dataSourceAdded);
	eventHelper.add(viewer.dataSources.dataSourceRemoved, dataSourceRemoved);

	viewer.screenSpaceEventHandler.setInputAction(pickAndSelectObject, Cesium.ScreenSpaceEventType.LEFT_CLICK);
	viewer.screenSpaceEventHandler.setInputAction(pickAndTrackObject, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
	viewer.screenSpaceEventHandler.setInputAction(moveOverObject, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

	viewer.trackedEntity = undefined;

	viewer.selectedEntity = undefined;

	Cesium.knockout.track(viewer, ['trackedEntity', 'selectedEntity']);

	var knockoutSubscriptions = [];

	knockoutSubscriptions.push(Cesium.subscribeAndEvaluate(viewer, 'trackedEntity', function(value) {
		var scene = viewer.scene;
		var sceneMode = scene.frameState.mode;
		var isTracking = Cesium.defined(value);
		if (sceneMode === Cesium.SceneMode.COLUMBUS_VIEW || sceneMode === Cesium.SceneMode.SCENE2D) {
			scene.screenSpaceCameraController.enableTranslate = !isTracking;
		}

		if (sceneMode === Cesium.SceneMode.COLUMBUS_VIEW || sceneMode === Cesium.SceneMode.SCENE3D) {
			scene.screenSpaceCameraController.enableTilt = !isTracking;
		}

		if (isTracking &&  Cesium.defined(value.position)) {
			entityView = new Cesium.EntityView(value, scene, viewer.scene.globe.ellipsoid);
		} else {
			entityView = undefined;
		}
	}));

	knockoutSubscriptions.push(Cesium.subscribeAndEvaluate(viewer, 'selectedEntity', function(value) {
		if (Cesium.defined(value)) {
			if (Cesium.defined(infoBoxViewModel)) {
				infoBoxViewModel.titleText = Cesium.defined(value.name) ? value.name : value.id;
			}

			if (Cesium.defined(selectionIndicatorViewModel)) {
				selectionIndicatorViewModel.animateAppear();
			}
		} else {
			if (Cesium.defined(selectionIndicatorViewModel)) {
				selectionIndicatorViewModel.animateDepart();
			}
		}
	}));

	viewer.destroy = Cesium.wrapFunction(viewer, viewer.destroy, function() {
		eventHelper.removeAll();

		var i;
		for (i = 0; i < knockoutSubscriptions.length; i++) {
			knockoutSubscriptions[i].dispose();
		}

		viewer.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
		viewer.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

		var dataSources = viewer.dataSources;
		var dataSourceLength = dataSources.length;
		for (i = 0; i < dataSourceLength; i++) {
			dataSourceRemoved(dataSources, dataSources.get(i));
		}
	});
}



function ReloadLinePosition(viewer)
{
	for(var k in g_lines)
	{
		var color = '#FF0000';
		if(g_lines[k].properties.voltage == '13')
		{
			color = '#FF0000';
		}
		if(g_lines[k].properties.voltage == '15')
		{
			color = '#0000FF';
		}
		if(g_geojsons[k])
		{
			DrawLineModelByLine(viewer, g_lines[k], 4.0, color, null );
			//DrawBufferOfLine(viewer, 'test', g_lines[k], 1000, 3000, '#FF0000', 0.2);
		}
	}
}

function CheckIsTower(id)
{
	var ret = false;
	if(g_geojsons[id] && g_geojsons[id]['properties']['webgis_type'] && g_geojsons[id]['properties']['webgis_type'] === 'point_tower')
	{
		ret = true;
	}
	return ret;
}

function ReloadModelPosition(viewer)
{
	var ellipsoid = viewer.scene.globe.ellipsoid;
	for(var k in g_czmls)
	{
		if(g_gltf_models[k])
		{
			var t = GetTowerInfoByTowerId(k);
			if(t)
			{
				RemoveSegmentsTower(viewer, t);
			//}
			//var carto = Cesium.Cartographic.fromDegrees(g_czmls[k]['position']['cartographicDegrees'][0], g_czmls[k]['position']['cartographicDegrees'][1], g_czmls[k]['position']['cartographicDegrees'][2]);
			//var cart3 = ellipsoid.cartographicToCartesian(carto);
			//var mat4 = Cesium.Matrix4.fromRotationTranslation(Cesium.Matrix3.IDENTITY, cart3);
			//var m = Cesium.Matrix4.multiplyTransformation(g_gltf_models[k].modelMatrix, mat4, mat4);
			//g_gltf_models[k].modelMatrix = m;
				
				
				var lng = t['geometry']['coordinates'][0],
					lat = t['geometry']['coordinates'][1],
					height = t['geometry']['coordinates'][2],
					rotate = t['properties']['rotate'];
				
				if(!g_zaware) height = 0;
				PositionModel(ellipsoid, g_gltf_models[k], lng, lat, height, rotate);
			}
		}
	}
}

function GetNeighborTowers(ids)
{
	var ret = [];
	for(var j in ids)
	{
		var id = ids[j];
		if(g_geojsons[id])
		{
			var tower = g_geojsons[id];
			ret.push(tower);
		}
	}
	return ret;
}

function GetSegmentPairsByTowTowerId(id0, id1)
{
	var ret = {};
	ret['contact_points'] = [];
	ret['t0'] = 0.9;
	ret['w'] = 0.001;
	
	for(var i in g_segments)
	{
		var seg = g_segments[i];
		if(seg['start_tower'] == id0 && seg['end_tower'] == id1)
		{
			ret['contact_points'] = seg['contact_points'];
			ret['t0'] = seg['t0'];
			ret['w'] = seg['w'];
			break;
		}
	}
	return ret;
}

function GetPhaseColor(phase)
{
	var ret = '#000000';
	if(g_phase_color_mapping[phase])
	{
		ret = g_phase_color_mapping[phase];
	}
	return ret;
}

function GetContactPointByIndex(tower, side, index)
{
	var ret = null;
	for(var i in tower['properties']['model']['contact_points'])
	{
		var cp = tower['properties']['model']['contact_points'][i];
		if(cp['side'] == side && cp['contact_index'] == index)
		{
			ret = cp;
			break;
		}
	}
	return ret;
}

function RemoveSegmentsByType(viewer, webgis_type)
{
	var remove_one = function()
	{
		var ret = false;
		for(var i in g_geometry_segments)
		{
			var seg = g_geometry_segments[i];
			if(seg.webgis_type === webgis_type)
			{
				scene.primitives.remove(seg.primitive);
				g_geometry_segments.splice(i,1);
				ret = true;
				break;
			}
		}
		return ret;
	};
	
	if(type===undefined)
	{
		scene.primitives.removeAll();
		g_geometry_segments.length = 0;
	}else
	{
		var ok = remove_one();
		while(ok)
		{
			ok = remove_one();
		}
	}
}

function RemoveSegmentsFromArray(node0, node1)
{
	var ret;
	var id0, id1;
	if(node0['_id'] && node1['_id'])
	{
		id0 = node0['_id'];
		id1 = node1['_id']
	}
	if(node0['id'] && node1['id'])
	{
		id0 = node0['id'];
		id1 = node1['id']
	}
	if(id0 && id1)
	{
		for(var i in g_geometry_segments)
		{
			var seg = g_geometry_segments[i];
			if(
				(seg['start'] == id0 && seg['end'] == id1)
			|| 	(seg['end'] == id0 && seg['start'] == id1)
			){
				ret = seg;
				g_geometry_segments.splice(i,1);
				break;
			}
		}
	}
	return ret;
}

function CheckSegmentsRing(node0, node1)
{
	var find_prev = function(id, list)
	{
		for(var i in list)
		{
			var seg = list[i];
			if(id == seg['end'] && seg['webgis_type'] == 'edge_dn') return seg['start'];
		}
		return undefined;
	};
	var ret = false;
	var id0, id1;
	if(node0['_id'] && node1['_id'])
	{
		id0 = node0['_id'];
		id1 = node1['_id']
	}
	if(node0['id'] && node1['id'])
	{
		id0 = node0['id'];
		id1 = node1['id']
	}
	if(id0 && id1)
	{
		var prev = id0;
		while(prev)
		{
			oldprev = prev;
			prev = find_prev(oldprev, g_geometry_segments);
			if(prev && prev == id1)
			{
				ret = true;
				break;
			}
		}
	}
	return ret;
}

function CheckSegmentsExist(node0, node1)
{
	var ret = false;
	var id0, id1;
	if(node0['_id'] && node1['_id'])
	{
		id0 = node0['_id'];
		id1 = node1['_id']
	}
	if(node0['id'] && node1['id'])
	{
		id0 = node0['id'];
		id1 = node1['id']
	}
	if(id0 && id1)
	{
		for(var i in g_geometry_segments)
		{
			var seg = g_geometry_segments[i];
			if(  seg['webgis_type'] == 'edge_dn' &&
				((seg['start'] == id0 && seg['end'] == id1)
			|| 	(seg['end'] == id0 && seg['start'] == id1)
			)){
				ret = true;
				break;
			}
		}
	}
	return ret;
}


function RemoveLineModel(viewer, line_id)
{
	var m;
	var l = [];
	for(var id in g_geometry_lines)
	{
		if(id.indexOf(line_id) > -1)
		{
			var model = g_geometry_lines[id];
			l.push({id:id, model:model});
		}
	}
	while(l.length>0)
	{
		var o = l.pop();
		delete g_geometry_lines[o.id];
		viewer.scene.primitives.remove(o.model);	
	}
}



function RemoveSegmentsBetweenTwoNode(viewer, node0, node1)
{
	var scene = viewer.scene;
	if(CheckSegmentsExist(node0, node1))
	{
		var seg = RemoveSegmentsFromArray(node0, node1);
		if(seg)
		{
			while(!seg.primitive.isDestroyed())
			{
				var ret = scene.primitives.remove(seg.primitive);
			}
		}
	}
}

function DrawBufferOfLine1(viewer, buf_id, line, width, height, color, alpha)
{
	var ellipsoid = viewer.scene.globe.ellipsoid;
	//console.log(line);
	var array = SortTowersByTowersPair(line['properties']['towers_pair']);
	//g = GetTowerGeojsonByTowerIdArray(st);
	
	var positions = GetPositions2DByCzmlArray(ellipsoid, array);
	DrawBufferCorridorGeometry(viewer, buf_id, positions, width, height, color, alpha);
}

function DrawBufferOfLine(viewer, buf_id, line, width, height, color, alpha, callback)
{
	var ellipsoid = viewer.scene.globe.ellipsoid;
	if(g_geojsons[line['_id']])
	{
		//var array = SortTowersByTowersPair(line['properties']['towers_pair']);
		//g = GetTowerGeojsonByTowerIdArray(array);
		
		var cond = {'db':g_db_name, 'collection':'-', 'action':'buffer', 'data':g_geojsons[line['_id']], 'distance':width};
		MongoFind(cond, function(data){
			array = data[0]['coordinates'];
			
			var positions = GetPositionsByGeojsonCoordinatesArray(ellipsoid, array[0]);
			DrawBufferPolygon(viewer, buf_id, positions, width, height, color, alpha);
			if(callback) callback();
		});
	}
}

function SortTowersByTowersPair(pairlist)
{
	var ret = [];
	var find_prev = function(id, list)
	{
		for(var i in list)
		{
			var pair =  list[i];
			if(id == pair[1]) return pair[0];
		}
		return undefined;
	};
	var find_next = function(id, list)
	{
		var r = []
		for(var i in list)
		{
			var pair =  list[i];
			if(id == pair[0])
			{
				r.push(pair[1]);
			}
		}
		return r;
	};
	
	var find_order_list = function(list,  start, index)
	{
		var l = []
		l.push(start);
		var next = find_next(start, list);
		var startold;
		while(next.length>0)
		{
			if(next.length >= index+1)
			{
				startold = start;
				start = next[index];
				l.push(start);
				var idx = list.indexOf([startold, start]);
				if(idx>-1) list.splice(idx, 1);
				next = find_next(start, list);
			}
			else
			{
				break;
			}
		}
		return l;
	};

	var list  = pairlist.slice();
	
	if(pairlist.length>0)
	{
		pair0 = pairlist[0];
		var oldprev = pair0[0];
		var prev = find_prev(oldprev, list);
		while(prev)
		{
			oldprev = prev;
			prev = find_prev(oldprev, list);
		}
		//console.log(oldprev);
		ret = find_order_list(list,  oldprev, 0);
	}
	return ret;
}

function GetTowerGeojsonByTowerIdArray(array)
{
	var ret = {'type':'LineString', 'coordinates':[]};
	for(var i in array)
	{
		var id = array[i];
		if(g_geojsons[id])
		{
			ret['coordinates'].push(g_geojsons[id]['geometry']['coordinates']);
		}
	}
	return ret;
}
function DrawBufferOfLine2(viewer, buf_id, line, width, height, color, alpha, callback)
{
	var ellipsoid = viewer.scene.globe.ellipsoid;
	var st = SortTowersByTowersPair(line['properties']['towers_pair']);
	g = GetTowerGeojsonByTowerIdArray(st);
	//console.log(g);
		
	var cond = {'db':g_db_name, 'collection':'-', 'action':'buffer', 'data':g, 'distance':width};
	MongoFind(cond, function(data){
		array = data[0]['coordinates'];
		console.log(array[0]);
		var positions = GetPositionsByGeojsonCoordinatesArray(ellipsoid, array[0]);
		DrawBufferPolygon(viewer, buf_id, positions, width, height, color, alpha);
		if(callback) callback();
	});
		
}


function RemoveBuffer(viewer, buf_id)
{
	for(var i in g_buffers)
	{
		if(i === buf_id)
		{
			var primitive = g_buffers[i];
			viewer.scene.primitives.remove(primitive);
			delete g_buffers[i];
		}
	}
}

function DrawBufferCorridorGeometry(viewer, buf_id, positions, width, height, color, alpha)
{
	RemoveBuffer(viewer, buf_id);
	var ellipsoid = viewer.scene.globe.ellipsoid;
	var rgba = tinycolor(color).toRgb();
	rgba.a = 0.5;
	if(alpha) rgba.a = alpha;
	rgba = 'rgba(' + rgba.r + ',' + rgba.g + ',' + rgba.b + ',' + rgba.a + ')';
	
	if(!g_zaware) height = 0;
	
	var corridorGeometry = new Cesium.CorridorGeometry({
			positions : positions,
			width : width*2,
			extrudedHeight : height,
			vertexFormat : Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
			cornerType: Cesium.CornerType.ROUNDED
			//cornerType: Cesium.CornerType.BEVELED
			//cornerType: Cesium.CornerType.MITERED
	});
	var primitive = new Cesium.Primitive({
		geometryInstances : new Cesium.GeometryInstance({
			id:	buf_id,
			geometry : corridorGeometry,
			attributes : {
				color : Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.fromCssColorString(rgba))
			}
		}),
		appearance : new Cesium.PerInstanceColorAppearance({
            flat:true,
            closed : true,
            translucent : true,
			//material : Cesium.Material.fromType('Color', {
				//color : Cesium.Color.fromCssColorString(rgba)
			//}),
			renderState : {
				depthTest : {
					enabled : true
				}
			}
		})
	});
	//console.log(corridorGeometry);
	viewer.scene.primitives.add(primitive);
	g_buffers[buf_id] = primitive;
}

function DrawBufferPolygon(viewer, buf_id, positions, width, height, color, alpha)
{
	RemoveBuffer(viewer, buf_id);
	var ellipsoid = viewer.scene.globe.ellipsoid;
	var rgba = tinycolor(color).toRgb();
	rgba.a = 0.5;
	if(alpha) rgba.a = alpha;
	rgba = 'rgba(' + rgba.r + ',' + rgba.g + ',' + rgba.b + ',' + rgba.a + ')';
	
	if(!g_zaware) height = 0;
	
	var geometry = new Cesium.PolygonGeometry.fromPositions({
			positions : positions,
			extrudedHeight : height,
			vertexFormat : Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
	});
	var primitive = new Cesium.Primitive({
		geometryInstances : new Cesium.GeometryInstance({
			id:	buf_id,
			geometry : geometry,
			attributes : {
				color : Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.fromCssColorString(rgba))
			}
		}),
		appearance : new Cesium.PerInstanceColorAppearance({
            flat:true,
            closed : true,
            translucent : true,
			//material : Cesium.Material.fromType('Color', {
				//color : Cesium.Color.fromCssColorString(rgba)
			//}),
			renderState : {
				depthTest : {
					enabled : true
				}
			}
		})
	});
	//console.log(corridorGeometry);
	viewer.scene.primitives.add(primitive);
	g_buffers[buf_id] = primitive;
	
	
}

function GetPositionsByGeojsonCoordinatesArray(ellipsoid, arr, force2d)
{
	var ret = [];
	for(var i in arr)
	{
		var lng = arr[i][0];
		var lat = arr[i][1];
		var alt = 0;
		if(arr[i].length == 3)
			alt = arr[i][2];
		var pos = [];
		pos.push(lng);
		pos.push(lat);
		if(force2d)
		{
			pos.push(0);
		}else
		{
			if(g_zaware)
			{
				pos.push(alt);
			}else
			{
				pos.push(0);
			}
		}
		var carto = Cesium.Cartographic.fromDegrees(pos[0],  pos[1],  pos[2]);
		var p = ellipsoid.cartographicToCartesian(carto);
		ret.push(p);
	}
	return ret;
}

function GetPositionsByCzmlArray(ellipsoid, arr, force2d)
{
	var ret = [];
	for(var i in arr)
	{
		var id = arr[i];
		if(g_czmls[id])
		{
			var cz = g_czmls[id];
			var pos = [];
			pos.push(cz['position']['cartographicDegrees'][0]);
			pos.push(cz['position']['cartographicDegrees'][1]);
			if(force2d)
			{
				pos.push(0);
			}else
			{
				if(g_zaware)
				{
					pos.push(cz['position']['cartographicDegrees'][2]);
				}else
				{
					pos.push(0);
				}
			}
			var carto = Cesium.Cartographic.fromDegrees(pos[0],  pos[1],  pos[2]);
			var p = ellipsoid.cartographicToCartesian(carto);
			ret.push(p);
		}
	}
	return ret;
}
function GetPositions2DByCzmlArray(ellipsoid, arr)
{
	return GetPositionsByCzmlArray(ellipsoid, arr, true);
}

//function DrawLineModelByLine(viewer, line, width, color, alpha, callback)
//{
	//RemoveLineModel(viewer, line['_id']);
	//var ellipsoid = viewer.scene.globe.ellipsoid;
	
	//var rgba = tinycolor(color).toRgb();
	//rgba.a = 0.5;
	//if(alpha) rgba.a = alpha;
	//rgba = 'rgba(' + rgba.r + ',' + rgba.g + ',' + rgba.b + ',' + rgba.a + ')';
	////console.log(rgba);
	
	//var _id = line['_id'];
	//var cond = {'db':g_db_name, 'collection':'get_line_geojson', '_id':_id};
	//MongoFind(cond, function(data){
		//if(data.length>0)
		//{
			//g_geojsons[_id] = data[0];
			
			//array = data[0]['geometry']['coordinates'];
			//pairs = data[0]['properties']['towers_pair'];
			////console.log(array);
			//for(var i in array)
			//{
				//var poss = GetPositionsByGeojsonCoordinatesArray(ellipsoid, array[i]);
				//var primitive = new Cesium.Primitive({
					//geometryInstances : new Cesium.GeometryInstance({
						//id:	line['_id'] + '_' + pairs[i][0] + '_' + pairs[i][1],
						//geometry : new Cesium.PolylineGeometry({
							//positions : poss,
							//width : width,
							//vertexFormat : Cesium.PolylineMaterialAppearance.VERTEX_FORMAT
						//})
					//}),
					//appearance : new Cesium.PolylineMaterialAppearance({
						////material : Cesium.Material.fromType(Cesium.Material.PolylineGlowType)
						//material : Cesium.Material.fromType('Color', {
							//color : Cesium.Color.fromCssColorString(rgba)
						//}),
						//renderState : {
							//depthTest : {
								//enabled : false
							//}
						//}
					//})
				//});
				//viewer.scene.primitives.add(primitive);
				//g_geometry_lines[line['_id'] + '_' + + pairs[i][0] + '_' + pairs[i][1]] = primitive;
				////if(i==0) break;
			//}
		//}
		//if(callback) callback();
	//});

//}


function DrawSegmentsBetweenTwoDNNode(viewer, previd, nextid, fresh)
{
	var scene = viewer.scene;
	var ellipsoid = viewer.scene.globe.ellipsoid;
	var polylines = new Cesium.PolylineCollection({
		modelMatrix:Cesium.Matrix4.IDENTITY,
		depthTest : false
	});
	var positions = [];
	if(g_czmls[previd])
	{
		var a = g_czmls[previd]['position']['cartographicDegrees'];
		if(!g_zaware) a[2] = 0;
		var carto = Cesium.Cartographic.fromDegrees(a[0], a[1], a[2]);
		var cart3 = ellipsoid.cartographicToCartesian(carto);
		positions.push(cart3);
	}
	if(g_czmls[nextid])
	{
		var a = g_czmls[nextid]['position']['cartographicDegrees'];
		if(!g_zaware) a[2] = 0;
		var carto = Cesium.Cartographic.fromDegrees(a[0], a[1], a[2]);
		var cart3 = ellipsoid.cartographicToCartesian(carto);
		positions.push(cart3);
	}
	var color = Cesium.Color.fromCssColorString("rgba(255,255,0,1)");
	if(!fresh) color = Cesium.Color.fromCssColorString("rgba(225,225,0,1)");
	var polyline = polylines.add({
		positions : positions,
		material : Cesium.Material.fromType('PolylineArrow', {
		//material : Cesium.Material.fromType('Color', {
			color : color
		}),
		width : 10.0,
		id:{ properties:{'start':previd, 'end':nextid, webgis_type:'edge_dn'}}
	});
	//console.log(polyline);
	scene.primitives.add(polylines);
	g_geometry_segments.push({'start':previd, 'end':nextid, 'primitive':polylines, webgis_type:'edge_dn', properties:{'start':previd, 'end':nextid, webgis_type:'edge_dn'}});
}

function DrawSegmentsBetweenTowTower(viewer, tower0, tower1, prev_len, next_len, exist)
{
	var scene = viewer.scene;
	if(tower0 && tower1 && !CheckSegmentsExist(tower0, tower1))
	{
		var ellipsoid = scene.globe.ellipsoid;
		var lng0 = tower0['geometry']['coordinates'][0],
			lat0 = tower0['geometry']['coordinates'][1],
			height0 = tower0['geometry']['coordinates'][2],
			rotate0 = Cesium.Math.toRadians(tower0['properties']['rotate'] - 90),
			lng1 = tower1['geometry']['coordinates'][0],
			lat1 = tower1['geometry']['coordinates'][1],
			height1 = tower1['geometry']['coordinates'][2],
			rotate1 = Cesium.Math.toRadians(tower1['properties']['rotate'] - 90);
		
		if(!g_zaware)
		{
			height0 = 0;
			height1 = 0;
		}else
		{
			//var h0 = viewer.scene.globe.getHeight(Cesium.Cartographic.fromDegrees(lng0,  lat0));
			//if(h0 && h0>0) height0 = h0;
			//var h1 = viewer.scene.globe.getHeight(Cesium.Cartographic.fromDegrees(lng1,  lat1));
			//if(h1 && h1>0) height1 = h1;
		
		}

		var cart3_0 = ellipsoid.cartographicToCartesian(Cesium.Cartographic.fromDegrees(lng0, lat0, height0));
		var	modelMatrix_0 = Cesium.Transforms.eastNorthUpToFixedFrame(cart3_0);
		var	quat_0 = Cesium.Quaternion.fromAxisAngle(Cesium.Cartesian3.UNIT_Z, rotate0);
		var	rot_mat3_0 = Cesium.Matrix3.fromQuaternion(quat_0);
		
		var cart3_1 = ellipsoid.cartographicToCartesian(Cesium.Cartographic.fromDegrees(lng1, lat1, height1));
		var	modelMatrix_1 = Cesium.Transforms.eastNorthUpToFixedFrame(cart3_1);
		var	quat_1 = Cesium.Quaternion.fromAxisAngle(Cesium.Cartesian3.UNIT_Z, rotate1);
		var	rot_mat3_1 = Cesium.Matrix3.fromQuaternion(quat_1);
		
		
		var obj = GetSegmentPairsByTowTowerId(tower0['_id'], tower1['_id']);
		var t0 = obj['t0'];
		var w = obj['w'];
		var arr = obj['contact_points'];
		var segpairs = [];
		//var counter = {};
		for(var i in arr)
		{
			var key = arr[i].start + '-' + arr[i].end;
			//if(!counter[key]) 
				//counter[key] = 1;
			//counter[key] += 1;
			if(!exist[tower0['_id']]) exist[tower0['_id']] = [];
			if(exist[tower0['_id']].indexOf(key)<0)
			{
				exist[tower0['_id']].push(key);
				segpairs.push(arr[i]);
			}
		}
		//console.log(tower0['_id']  + '-' + tower1['_id'] );
		//console.log(segpairs.length);
		//console.log(counter);
		
		var polylines = new Cesium.PolylineCollection({
			modelMatrix:Cesium.Matrix4.IDENTITY,
			depthTest : false
		});
		for(var i in segpairs)
		{
			var pair = segpairs[i];
			var cp0 = GetContactPointByIndex(tower0, 0, pair['start']);
			var	cp1 = GetContactPointByIndex(tower1, 1, pair['end']);
			var color = Cesium.Color.fromCssColorString(GetPhaseColor(pair['phase']));
			
			
			if(cp0 && cp1)
			{
				var tran_vec3_0 = new Cesium.Cartesian3(cp0['x'], cp0['z'], cp0['y']);
				var mat4_0 = Cesium.Matrix4.fromRotationTranslation(rot_mat3_0, Cesium.Cartesian3.ZERO);
				mat4_0 = Cesium.Matrix4.multiplyByTranslation(mat4_0, tran_vec3_0, mat4_0);
				var m_0 = Cesium.Matrix4.multiplyTransformation(modelMatrix_0, mat4_0, mat4_0);
				
				
				var tran_vec3_1 = new Cesium.Cartesian3(cp1['x'], cp1['z'], cp1['y']);
				var mat4_1 = Cesium.Matrix4.fromRotationTranslation(rot_mat3_1, Cesium.Cartesian3.ZERO);
				mat4_1 = Cesium.Matrix4.multiplyByTranslation(mat4_1, tran_vec3_1, mat4_1);
				var m_1 = Cesium.Matrix4.multiplyTransformation(modelMatrix_1, mat4_1, mat4_1);

				var p0 = Cesium.Matrix4.getTranslation(m_0, m_0),
					p1 = Cesium.Matrix4.getTranslation(m_1, m_1);
				
				var positions = CalcCatenary(ellipsoid, p0, p1, 15, t0, w);
				var polyline = polylines.add({
					positions : positions,
					material : Cesium.Material.fromType('Color', {
						color : color,
						translucent:true
					}),
					width : 1.0
				});
			}
		}
		scene.primitives.add(polylines);
		g_geometry_segments.push({'start':tower0['_id'], 'end':tower1['_id'], 'primitive':polylines});
	}
	return exist;
}

function CalcCatenary(ellipsoid, p0, p1, segnum, t0, w)
{
	var ret = [];
	if(g_use_catenary)
	{
		//var l = MathLib.sqrt((p0.x-p1.x)*(p0.x-p1.x) + (p0.y-p1.y)*(p0.y-p1.y));
		//var h = p1.z - p0.z;
		//var step = l/segnum;
		//var dx = (p1.x-p0.x)/segnum,
			//dy = (p1.y-p0.y)/segnum;
		
		//for(var i=0; i<=segnum; i++)
		//{
			//var z = get_z(l, h, p0.z, i*step, 0.7, 0.001);
			//var p = new Cesium.Cartesian3(p0.x + i * dx,  p0.y + i * dy,  z);
			//ret.push(p);
		//}
		var carto0 = ellipsoid.cartesianToCartographic(p0);
		var carto1 = ellipsoid.cartesianToCartographic(p1);
		//var l = MathLib.sqrt((carto0.longitude-carto1.longitude)*(carto0.longitude-carto1.longitude) + (carto0.latitude-carto1.latitude)*(carto0.latitude-carto1.latitude));
		var l = MathLib.sqrt((p0.x-p1.x)*(p0.x-p1.x) + (p0.y-p1.y)*(p0.y-p1.y));
		var h = carto1.height - carto0.height;
		var step = l/segnum;
		var dx = (carto1.longitude-carto0.longitude)/segnum,
			dy = (carto1.latitude-carto0.latitude)/segnum;
		
		for(var i=0; i<=segnum; i++)
		{
			var z = get_z(l, h, carto0.height, i*step, t0, w);
			var carto = new Cesium.Cartographic(carto0.longitude + i * dx,  carto0.latitude + i * dy,  z);
			var p = ellipsoid.cartographicToCartesian(carto);
			ret.push(p);
		}
	}else
	{
		ret = [	p0,p1];
	}
	return ret;
}


function RemoveSegmentsTower(viewer, tower)
{
	var scene = viewer.scene;
	var arr = GetPrevNextTowerIds(tower);

	var prev_towers = GetNeighborTowers(arr[0]);
	var next_towers = GetNeighborTowers(arr[1]);
	//console.log(prev_towers);
	//console.log(next_towers);
	for(var i in prev_towers)
	{
		var t = prev_towers[i];
		RemoveSegmentsBetweenTwoNode(viewer, t, tower);
	}
	for(var i in next_towers)
	{
		var t = next_towers[i];
		RemoveSegmentsBetweenTwoNode(viewer, tower, t);
	}
}

function GetPrevNextTowerIds(tower)
{
	var prevs = [];
	var nexts = [];
	for(var i in g_lines)
	{
		var towers_pair = g_lines[i]['properties']['towers_pair'];
		for(var j in towers_pair)
		{
			var pair = towers_pair[j];
			
			if(pair[0] === tower['_id'])
			{
				if(nexts.indexOf(pair[1])<0)
				{
					nexts.push(pair[1]);
				}
			}
			if(pair[1] === tower['_id'])
			{
				if(prevs.indexOf(pair[0])<0)
				{
					prevs.push(pair[0]);
				}
			}
		}
	}
	return [prevs, nexts];
}


//function CheckHasMoreNext(id)
//{

//}


function DrawSegmentsByTower(viewer, tower)
{
	var scene = viewer.scene;
	var arr = GetPrevNextTowerIds(tower);
	var prev_towers = GetNeighborTowers(arr[0]);
	var next_towers = GetNeighborTowers(arr[1]);
	var lng = parseFloat($('#form_tower_info_base').webgisform('get','lng').val()),
		lat = parseFloat($('#form_tower_info_base').webgisform('get','lat').val()),
		height = parseFloat($('#form_tower_info_base').webgisform('get','alt').val()),
		rotate = parseFloat($('#form_tower_info_base').webgisform('get','rotate').val());
		
		
	if($.isNumeric(lng) && $.isNumeric(lat) && $.isNumeric(height) && $.isNumeric(rotate))
	{
		var tt = {};
		tt['_id'] = tower['_id'];
		tt['geometry'] = {};
		tt['geometry']['coordinates'] = [lng, lat, height];
		tt['properties'] = {};
		tt['properties']['rotate'] = rotate;
		tt['properties']['model'] = tower['properties']['model'];
		var exist = {};
		for(var i in prev_towers)
		{
			var t = prev_towers[i];
			exist = DrawSegmentsBetweenTowTower(viewer, t, tt, prev_towers.length, 1, exist);
		}
		for(var i in next_towers)
		{
			var t = next_towers[i];
			exist = DrawSegmentsBetweenTowTower(viewer, tt, t, 1, next_towers.length, exist);
		}
	}
}


function CheckTowerInfoModified()
{
	var id = $('#form_tower_info_base').webgisform('get','id').val();
	var tower = GetTowerInfoByTowerId(id);
	if(tower)
	{
		var lng = parseFloat($('#form_tower_info_base').webgisform('get','lng').val()),
			lat = parseFloat($('#form_tower_info_base').webgisform('get','lat').val()),
			height = parseFloat($('#form_tower_info_base').webgisform('get','alt').val()),
			rotate = parseFloat($('#form_tower_info_base').webgisform('get','rotate').val());
		var mc = $('#form_tower_info_base').webgisform('get','model_code').val();
		if(lng != tower['geometry']['coordinates'][0] 
		|| lat != tower['geometry']['coordinates'][1]
		|| height != tower['geometry']['coordinates'][2]
		|| rotate != tower['properties']['rotate']
		|| mc != tower['properties']['model']['model_code']
		)
		{
			return true;
		}
		for(var k in tower['properties'])
		{
			if($('#form_tower_info_base').webgisform('get', k).length)
			{
				var v = $('#form_tower_info_base').webgisform('get', k).val();
				
				if(v.length>0 && v != tower['properties'][k] )
				{
					return true;
				}
			}
		}
	}
	return false;
}

function SaveTower(id)
{
	if(id)
	{
		console.log('save tower ' + id);
	}else
	{
		var id = $('#form_tower_info_base').webgisform('get','id').val();
		console.log('save form tower ' + id);
	}
}

function SavePoi(data, callback)
{
	//console.log(data);
	var cond = {'db':g_db_name, 'collection':'features', 'action':'save', 'data':data};
	ShowProgressBar(true, 670, 200, '保存中', '正在保存数据，请稍候...');

	MongoFind(cond, function(data1){
		ShowProgressBar(false);
		if(data1.result)
		{
			//ShowMessage(null, 400, 200, '错误','保存出错:' + data1.result, callback);
			$.jGrowl("保存失败" + data1.result, { 
				life: 2000,
				position: 'bottom-right', //top-left, top-right, bottom-left, bottom-right, center
				theme: 'bubblestylefail',
				glue:'before'
			});
		}
		else
		{
			$.jGrowl("保存成功", { 
				life: 2000,
				position: 'bottom-right', //top-left, top-right, bottom-left, bottom-right, center
				theme: 'bubblestylesuccess',
				glue:'before'
			});
		}
		if(callback) callback(data1);
	});
}



function ShowTowerInfo(viewer, id)
{
	var tower = GetTowerInfoByTowerId(id);
	
	if(tower)
	{
		FilterModelList('');
		ShowTowerInfoDialog(viewer, tower);
		LoadTowerModelByTower(viewer, tower);
		DrawSegmentsByTower(viewer, tower);
	}

}

function UpdateJssorSlider(container_id, toggle_id, width, height, bindcollection, key, category)
{
	var data = {op:'gridfs', db:g_db_name, width:150, height:150, bindcollection:bindcollection, key:key, category:category};
	GridFsFind(data, function(data1){
		if(g_image_slider_tower_info)
		{
			delete g_image_slider_tower_info;
			g_image_slider_tower_info = undefined;
			g_image_thumbnail_tower_info.length = 0;
		}
		g_image_thumbnail_tower_info = data1;
		$('#' + container_id).empty();
		var s = '';
		if(data1.length>0)
		{
			s += '\
			<div u="loading" style="position: absolute; top: 0px; left: 0px;">\
				<div style="filter: alpha(opacity=70); opacity:0.7; position: absolute; display: block;\
					background-color: #000; top: 0px; left: 0px;width: ' + width + 'px;height:' + height + 'px;">\
				</div>\
				<div style="position: absolute; display: block; background: url(img/loading.gif) no-repeat center center;\
					top: 0px; left: 0px;width: ' + width + 'px;height:' + height + 'px;">\
				</div>\
			</div>\
			';
		}
		s += '\
		<div u="slides" style="cursor: default; position: absolute; left: 0px; top: 0px; width: ' + width + 'px; height: ' + height + 'px; overflow: hidden;">\
		';
		for (var i in data1)
		{
			s += '\
			<div>\
				<img u="image" id="' + data1[i]._id + '" src="get?op=gridfs&db=' + g_db_name + '&_id=' + data1[i]._id + '" />\
				<img u="thumb" src="data:' + data1[i].mimetype + ';base64,' + data1[i].data + '" />\
			</div>\
			';
		}
		if(data1.length==0)
		{
			s += '\
			<div style="text-align: center;vertical-align: middle;line-height: 300px;">\
				<img u="image" style="display:none;"  src="" />\
				<img u="thumb" style="display:none;" src=""  />\
				无照片\
			</div>\
			';
		}
		
		s += '</div>\
		<div u="thumbnavigator" class="jssort07" style="position: absolute; width: ' + width + 'px; height: 100px; left: 0px; bottom: 0px; overflow: hidden; ">\
			<div style=" background-color: #000; filter:alpha(opacity=30); opacity:.3; width: 90%; height:100%;"></div>\
			<div u="slides" style="cursor: default;">\
				<div u="prototype" class="p" style="position: absolute; width: 99px; height: 66px; top: 0; left: 0;">\
					<thumbnailtemplate class="i" style="position:absolute;"></thumbnailtemplate>\
					<div class="o">\
					</div>\
				</div>\
			</div>\
			<span u="arrowleft" class="jssora11l" style="width: 37px; height: 37px; top: 123px; left: 8px;">\
			</span>\
			<span u="arrowright" class="jssora11r" style="width: 37px; height: 37px; top: 123px; right: 8px">\
			</span>\
		</div>\
		';
		$('#' + container_id).append(s);
		
		if(!g_image_slider_tower_info)
		{
			//$( "#tower_info_photo" ).accordion({ active: 0 });
			var options = {
				$AutoPlay: true,                                    //[Optional] Whether to auto play, to enable slideshow, this option must be set to true, default value is false
				$AutoPlayInterval: 10000,                            //[Optional] Interval (in milliseconds) to go for next slide since the previous stopped if the slider is auto playing, default value is 3000
				$SlideDuration: 500,                                //[Optional] Specifies default duration (swipe) for slide in milliseconds, default value is 500
				$DragOrientation: 3,                                //[Optional] Orientation to drag slide, 0 no drag, 1 horizental, 2 vertical, 3 either, default value is 1 (Note that the $DragOrientation should be the same as $PlayOrientation when $DisplayPieces is greater than 1, or parking position is not 0)

				$ThumbnailNavigatorOptions: {
					$Class: $JssorThumbnailNavigator$,              //[Required] Class to create thumbnail navigator instance
					$ChanceToShow: 2,                               //[Required] 0 Never, 1 Mouse Over, 2 Always

					$Loop: 2,                                       //[Optional] Enable loop(circular) of carousel or not, 0: stop, 1: loop, 2 rewind, default value is 1
					$SpacingX: 3,                                   //[Optional] Horizontal space between each thumbnail in pixel, default value is 0
					$SpacingY: 3,                                   //[Optional] Vertical space between each thumbnail in pixel, default value is 0
					$DisplayPieces: 6,                              //[Optional] Number of pieces to display, default value is 1
					$ParkingPosition: 204,                          //[Optional] The offset position to park thumbnail,

					$ArrowNavigatorOptions: {
						$Class: $JssorArrowNavigator$,              //[Requried] Class to create arrow navigator instance
						$ChanceToShow: 2,                               //[Required] 0 Never, 1 Mouse Over, 2 Always
						$AutoCenter: 2,                                 //[Optional] Auto center arrows in parent container, 0 No, 1 Horizontal, 2 Vertical, 3 Both, default value is 0
						$Steps: 1                                       //[Optional] Steps to go for each navigation request, default value is 1
					}
				}
			};
			g_image_slider_tower_info = new $JssorSlider$("tower_info_photo_container", options);
		}
		ShowProgressBar(false);
		//responsive code begin
		//you can remove responsive code if you don't want the slider scales while window resizes
		function ScaleSlider() {
			//console.log($('#tower_info_photo').css('width'));
			if(g_image_slider_tower_info)
			{
				var parentWidth = g_image_slider_tower_info.$Elmt.parentNode.parentNode.parentNode.parentNode.clientWidth;
				//console.log(parentWidth);
				if (parentWidth)
				{
					//$('#tower_info_photo_container').css('width', parentWidth)
					//g_image_slider_tower_info.$SetScaleWidth(Math.min(parentWidth, 550));
					var w = parentWidth - 20;
					g_image_slider_tower_info.$SetScaleWidth(w );
					$('#' + toggle_id).css('width', (w-20) + 'px' );
				}
			}
			//else
				//window.setTimeout(ScaleSlider, 30);
		}

		//ScaleSlider();

		//if (!navigator.userAgent.match(/(iPhone|iPod|iPad|BlackBerry|IEMobile)/)) {
			//$(window).bind('resize', ScaleSlider);
		//}

		
		//if (navigator.userAgent.match(/(iPhone|iPod|iPad)/)) {
		//    $(window).bind("orientationchange", ScaleSlider);
		//}
		//responsive code end
		

	});

}
function UpdateFileUploader(uploader_container_id)
{
	try{
		$('#' + uploader_container_id + '_form').fileupload('destroy');
	}catch(e){}
	$('#' + uploader_container_id).empty();
	$('#' + uploader_container_id).append(
	'\
		<form id="' + uploader_container_id + '_form"  method="POST"  enctype="multipart/form-data">\
			<div class="row fileupload-buttonbar">\
				<div class="col-lg-7">\
					<!-- The fileinput-button span is used to style the file input field as button -->\
					<span class="btn-success fileinput-button" style="border:2px green solid;">\
						<!--<i class="glyphicon glyphicon-plus"></i>-->\
						<span >选择文件...</span>\
						<input type="file" name="files[]">  <!--multiple-->\
					</span>\
					<!--<button type="submit" class="btn btn-primary start">-->\
						<!--<!--<i class="glyphicon glyphicon-upload"></i>-->\
						<!--<span>上传</span>-->\
					<!--</button>-->\
					<!--<button type="reset" class="btn btn-warning cancel">-->\
						<!--<!--<i class="glyphicon glyphicon-ban-circle"></i>-->\
						<!--<span>取消</span>-->\
					<!--</button>-->\
					<!--<button type="button" class="btn btn-danger delete">-->\
						<!--<!--<i class="glyphicon glyphicon-trash"></i>-->\
						<!--<span>删除</span>-->\
					<!--</button>-->\
					<!--<input type="checkbox" class="toggle">-->\
					<!-- The global file processing state -->\
					<span class="fileupload-process"></span>\
				</div>\
				<!-- The global progress state -->\
				<div class="col-lg-5 fileupload-progress fade" >\
					<!-- The global progress bar -->\
					<div class="progress progress-striped active" role="progressbar" aria-valuemin="0" aria-valuemax="100" style="display:none;width:90%;height:5px;margin:10px;">\
						<div class="progress-bar progress-bar-success" style="width:0%;"></div>\
					</div>\
					<!-- The extended global progress state -->\
					<div class="progress-extended">&nbsp;</div>\
				</div>\
			</div>\
			<!-- The table listing the files available for upload/download -->\
			<table role="presentation" class="table table-striped"><tbody class="files"></tbody></table>\
		</form>	\
	'
	);
	//style="border:0px;width:color:#00FF00;background-color:#000000;width:100%"
	

}



function ShowTowerInfoDialog(viewer, tower)
{
	var infoBox = viewer.infoBox;
	var title = '';
	title = tower['properties']['name'];
	$('#dlg_tower_info').dialog({
		width: 630,
		height: 720,
		minWidth:200,
		minHeight: 200,
		draggable: true,
		resizable: true, 
		modal: false,
		position:{at: "right center"},
		title:title,
		close: function(event, ui){
			$('#div_tower_photouploader_form').fileupload('destroy');
			$('#div_tower_photouploader').empty();
			if(g_image_slider_tower_info)
			{
				delete g_image_slider_tower_info;
				g_image_slider_tower_info = undefined;
				$('#tower_info_photo_container').empty();
				g_image_thumbnail_tower_info.length = 0;
			}
		},
		show: {
			effect: "slide",
			direction: "right",
			duration: 500
		},
		//hide: {
			//effect: "blind",
			//duration: 500
		//},		
		buttons:[
			{ 	
				//type: "checkbox",
				text: "锁定视角", 
				click: function(e){
					g_is_tower_focus = !g_is_tower_focus;
					var selectedEntity = viewer.selectedEntity;
					if(g_is_tower_focus)
					{
						$(e.target).css('background', '#00AA00 url(/css/black-green-theme/images/ui-bg_dots-medium_75_000000_4x4.png) 50% 50% repeat');
						$(e.target).html('解除锁定');
						
						if (Cesium.defined(selectedEntity)) 
						{
							viewer.trackedEntity = selectedEntity;
							var id = selectedEntity.id;
							//console.log('track id=' + id);
							LookAtTarget(viewer, id);
						}				
					}
					else
					{
						$(e.target).css('background', '#000000 url(/css/black-green-theme/images/ui-bg_dots-medium_75_000000_4x4.png) 50% 50% repeat');
						$(e.target).html('锁定视角');
						
						//var extent = GetExtentByCzml();
						//FlyToExtent(viewer, extent['west'], extent['south'], extent['east'], extent['north']);
						if(selectedEntity)
						{
							var vm = viewer.homeButton.viewModel;
							//vm.flightDuration = 1;
							vm.command();
							var pos = viewer.scene.globe.ellipsoid.cartesianToCartographic(selectedEntity.position._value);
							if(pos.height === 0.0) pos.height = 2000;
							//console.log('pos.height=' + pos.height);
							FlyToPoint(viewer, Cesium.Math.toDegrees(pos.longitude) , Cesium.Math.toDegrees(pos.latitude), pos.height, 2.8, 1);
						}
						
						
						
						
					}
				}
			},
			{ 	text: "保存", 
				click: function(){ 
					if($('#form_tower_info_base').valid())
					{
						if(CheckTowerInfoModified())
						{
							ShowConfirm(null, 500, 200,
								'保存确认',
								'检测到数据被修改，确认保存吗? 确认的话数据将会提交到服务器上，以便所有人都能看到修改的结果。',
								function(){
									SaveTower();
								},
								function(){
								
								}
							);
						}
						else{
							//$( this ).dialog( "close" );
						}
					}
				}
			},
			{ 	text: "关闭", 
				click: function(){ 
					$( this ).dialog( "close" );
				}
			}
		
		]
	});
	$('#tabs_tower_info').tabs({ 
		collapsible: false,
		active: 0,
		beforeActivate: function( event, ui ) {
			var title = ui.newTab.context.innerText;
			if(title == '杆塔模型')
			{
				$('#tower_info_model_list_filter').focus();
				var iframe = $(ui.newPanel.context).find('#tower_info_model').find('iframe');
				var url = GetModelUrl1(tower['properties']['model']['model_code_height']);
				$('#tower_info_model_list_toggle').find('a').html('>>显示列表');
				$('#tower_info_model_list').css('display', 'none');
				$('#tower_info_model').find('iframe').css('width', '99%');
				var obj = {};
				if(!CheckModelCode(tower['properties']['model']['model_code_height']) || url.length==0)
				{
					obj['data'] = tower['properties']['model'];
					obj['tower_id'] = tower['_id'];
					obj['denomi_height'] = tower['properties']['denomi_height'];
					$('#tower_info_title_model_code').html('杆塔型号：' + '无' + ' 呼称高：' + '无');
					//$('#tower_info_model_list_toggle').find('a').html('<<隐藏列表');
					//$('#tower_info_model_list').css('display', 'block');
					//$('#tower_info_model').find('iframe').css('width', '79%');
				}
				else if(url.length>0)
				{
					obj['url'] = '/' + url;
					obj['data'] = tower['properties']['model'];
					obj['tower_id'] = tower['_id'];
					obj['denomi_height'] = tower['properties']['denomi_height'];
					$('#tower_info_title_model_code').html('杆塔型号：' + tower['properties']['model']['model_code'] + ' 呼称高：' + tower['properties']['denomi_height']);
				}
				var json = encodeURIComponent(JSON.stringify(obj));
				iframe.attr('src', g_host + 'threejs/editor/index.html?' + json);
			}
			if(title == '架空线段')
			{
				var iframe = $(ui.newPanel.context).find('#tower_info_segment').find('iframe');
				var url = GetModelUrl1(tower['properties']['model']['model_code_height']);
				var arr = GetPrevNextTowerIds(tower);
				var next_ids = arr[1]
				//console.log(next_ids);
				var url_next = GetNextModelUrl(next_ids);
				if(url.length>0 && url_next.length>0)
				{
					iframe.css('display', 'block');
					$('#tower_info_segment_blank').css('display', 'none');
					var obj = {};
					obj['url'] = '/' + url;
					for(var i in url_next)
					{
						url_next[i] = '/' + url_next[i];
					}
					obj['url_next'] = url_next;
					//obj['data'] = tower['properties']['model'];
					obj['tower_id'] = tower['_id'];
					obj['next_ids'] = next_ids;
					//obj['data_next'] = GetNextTowerModelData(next_ids);
					obj['segments'] = GetSegmentsByTowerStartEnd(tower['_id'], next_ids);
					var json = encodeURIComponent(JSON.stringify(obj));
					
					iframe.attr('src', g_host + 'threejs/editor/index.html?' + json);
				}
				else
				{
					$('#tower_info_segment_blank').css('display', 'block');
					iframe.css('display', 'none');
				}
			}
			if(title == '照片')
			{
				ShowProgressBar(true, 670, 200, '载入中', '正在载入，请稍候...');
				UpdateJssorSlider('tower_info_photo_container', 'div_toggle_view_upload',  520, 400, 'towers', tower['_id'], 'photo');
				UpdateFileUploader('div_tower_photouploader');
				InitFileUploader('tower_info_photo_container','div_tower_photouploader','div_toggle_view_upload', 'tower_info_photo_toolbar', 'towers', tower['_id'], 'photo');

			}
		}
		//threejs/editor/index.html
	});
		
	var form = $('#form_tower_info_base').webgisform(g_tower_baseinfo_fields,
	{
		prefix:'tower_baseinfo_',
		maxwidth:520
	});
	if(tower)
	{
		var data = {
			'id':tower['_id'], 
			'lng':tower['geometry']['coordinates'][0],
			'lat':tower['geometry']['coordinates'][1],
			'alt':tower['geometry']['coordinates'][2],
			'rotate':tower['properties']['rotate'],
			'name':title,
			'tower_code':tower['properties']['tower_code'],
			'model_code':tower['properties']['model']['model_code'],
			'denomi_height':tower['properties']['denomi_height'],
			'grnd_resistance':tower['properties']['grnd_resistance'],
			'horizontal_span':tower['properties']['horizontal_span'],
			'vertical_span':tower['properties']['vertical_span'],
			'project':GetProjectNameByTowerId(tower['_id'])
		};	
		//SetFormData('form_tower_info_base', data);
		//var SetFormData = $('#form_tower_info_base').webgisform.SetFormData;
		//console.log(SetFormData);
		//SetFormData(data);
		$('#form_tower_info_base').webgisform('setdata', data);
		//var d = $('#form_tower_info_base').webgisform('getdata');
		//console.log(d);
	}
	if(tower)
	{
		var data = [];
		var idx = 1;
		for(var i in tower['properties']['metals'])
		{
			data.push({
				'idx':idx, 
				'type':tower['properties']['metals'][i]['type'],
				'model':tower['properties']['metals'][i]['model']
				});
			idx += 1;
		}
	}
	
	
	//var form_tower_info_metal = $("#form_tower_info_metal").ligerForm({
		//inputWidth: 120, labelWidth: 120, space: 10,
		//validate : true,
		//fields: []
	//});
	
	if(!g_contextmenu_metal)
	{
		g_contextmenu_metal = $.ligerMenu({ top: 100, left: 100, width: 120, items:
			[
			{ text: '增加金具', icon:'add',
				children:[
					{ text:'绝缘子串',click: AddMetal},
					{ text:'防振锤',click: AddMetal},
					{ text:'接地装置',click: AddMetal},
					{ text:'基础',click: AddMetal},
					{ text:'拉线',click: AddMetal},
					{ text:'防鸟刺',click: AddMetal},
					{ text:'在线监测装置',click: AddMetal},
					{ text:'雷电计数器',click: AddMetal}
				]
			},
			{ text: '删除金具', click: DeleteMetal,icon:'delete' }
			//{ line: true },
			//{ text: '查看', click: onclick11 },
			//{ text: '关闭', click: onclick112 }
			]
		});
	}
	
	$("#listbox_tower_info_metal").bind("contextmenu", function (e)
	{
		g_contextmenu_metal.show({ top: e.pageY, left: e.pageX });
		return false;
	});

	var listbox_tower_info_metal = $("#listbox_tower_info_metal").ligerListBox({
		data: data,
		valueField:'idx',
		textField: 'type',
		//readonly:true,
		columns: [
			{ header: 'ID', name: 'idx', width: 20 },
			{ header: '金具类型', name: 'type' },
			{ header: '金具型号', name: 'model' }
		],
		isMultiSelect: false,
		isShowCheckBox: false,
		width: 500,
		height:150,
		onSelected:function(idx, name, obj){
			if(obj)
			{
				g_selected_metal_item = obj;
				var o = obj;
				var flds = [];
				var formdata = {};
				if(o['type'] == '绝缘子串')
				{
					//var insulator_type_list = [
						//{'value':'导线绝缘子','text':'导线绝缘子'},
						//{'value':'跳线绝缘子','text':'跳线绝缘子'},
						//{'value':'地线绝缘子','text':'地线绝缘子'},
						//{'value':'OPGW绝缘子串','text':'OPGW绝缘子串'}
					//];
					//var mat_type_list = [
						//{'value':'未知','text':'陶瓷'},
						//{'value':'玻璃','text':'玻璃'},
						//{'value':'合成','text':'合成'},
						//{'value':'未知','text':'未知'}
					//];
					//var insulator_flds = [
						//{display: "类型", name: "type", newline: true,  type: "text", editor:{readonly:true}, width:275, validate:{required:true}},
						//{display: "绝缘子类型", name: "insulator_type", newline: true,  type: "select", editor: {data:insulator_type_list},  width:275},
						//{display: "绝缘子材料", name: "material", newline: true,  type: "select", editor: {data:mat_type_list},  width:275},
						//{display: "绝缘子型号", name: "model", newline: true,  type: "text", width:275},
						//{display: "串数", name: "strand", newline: true,  type: "digits", width:70},
						//{display: "片数", name: "slice", newline: false,  type: "digits", width:70},
						//{display: "生产厂家", name: "manufacturer", newline: true,  type: "text", width:275},
						//{display: "组装图号", name: "assembly_graph", newline: true,  type: "text", width:275}
					//];
					
					
					flds = g_insulator_flds;
					var metal = tower['properties']['metals'][o['idx']-1];
					for(var k in metal)
					{
						formdata[k] = metal[k];
					}
				}
				if(o['type'] == '防振锤')
				{
					//var damper_list = [
						//{'value':'导线大号侧','text':'导线大号侧'},
						//{'value':'导线小号侧','text':'导线小号侧'},
						//{'value':'地线大号侧','text':'地线大号侧'},
						//{'value':'地线小号侧','text':'地线小号侧'}
					//];
					//var damper_flds = [
						//{display: "类型", name: "type", newline: true,  type: "text", editor:{readonly:true},  width:275, validate:{required:true}},
						//{display: "安装部位", name: "side", newline: true,  type: "select", editor: {data:damper_list},  width:275},
						//{display: "防振锤型号", name: "model", newline: true,  type: "text", width:275},
						//{display: "防振锤数量", name: "count", newline: true,  type: "digits", width:70},
						//{display: "安装距离", name: "distance", newline: false,  type: "number", width:80},
						//{display: "生产厂家", name: "manufacturer", newline: true,  type: "text", width:275},
						//{display: "组装图号", name: "assembly_graph", newline: true,  type: "text", width:275}
					//];
					flds = g_damper_flds;
					var metal = tower['properties']['metals'][o['idx']-1];
					for(var k in metal)
					{
						formdata[k] = metal[k];
					}
				}
				if(o['type'] == '接地装置')
				{
					//var grd_flds = [
						//{display: "类型", name: "type", newline: true,  type: "text", editor:{readonly:true},  width:275, validate:{required:true}},
						//{display: "型号", name: "model", newline: true,  type: "text", width:275},
						//{display: "数量", name: "count", newline: true,  type: "digits", width:70},
						//{display: "埋深", name: "depth", newline: false,  type: "number", width:80},
						//{display: "生产厂家", name: "manufacturer", newline: true,  type: "text", width:275},
						//{display: "组装图号", name: "assembly_graph", newline: true,  type: "text", width:275}
					//];
					flds = g_grd_flds;
					var metal = tower['properties']['metals'][o['idx']-1];
					for(var k in metal)
					{
						formdata[k] = metal[k];
					}
				}
				if(o['type'] == '基础')
				{
					//var platform_model_list = [
						//{'value':'铁塔','text':'铁塔'},
						//{'value':'水泥塔','text':'水泥塔'}
					//];
					//var base_flds = [
						//{display: "类型", name: "type", newline: true,  type: "text", editor:{readonly:true},  width:275, validate:{required:true}},
						//{display: "平台类型", name: "platform_model", newline: true,  type: "select", editor: {data:platform_model_list}, width:275},
						//{display: "数量", name: "count", newline: true,  type: "digits", width:70},
						//{display: "埋深", name: "depth", newline: false,  type: "number", width:80},
						//{display: "生产厂家", name: "manufacturer", newline: true,  type: "text", width:275},
						//{display: "组装图号", name: "assembly_graph", newline: true,  type: "text", width:275}
					//];
					//flds = grd_flds;
					flds = g_base_flds_1;
					var metal = tower['properties']['metals'][o['idx']-1];
					for(var k in metal)
					{
						formdata[k] = metal[k];
					}
				}
				if(o['type'] == '拉线' || o['type'] == '防鸟刺' || o['type'] == '在线监测装置')
				{
					//var base_flds = [
						//{display: "类型", name: "type", newline: true,  type: "text", editor:{readonly:true},  width:275, validate:{required:true}},
						//{display: "型号", name: "model", newline: true,  type: "text", width:275},
						//{display: "数量", name: "count", newline: true,  type: "digits", width:70},
						//{display: "生产厂家", name: "manufacturer", newline: true,  type: "text", width:275},
						//{display: "组装图号", name: "assembly_graph", newline: true,  type: "text", width:275}
					//];
					flds = g_base_flds_2_3_4;
					var metal = tower['properties']['metals'][o['idx']-1];
					for(var k in metal)
					{
						formdata[k] = metal[k];
					}
				}
				if(o['type'] == '雷电计数器')
				{
					//var base_flds = [
						//{display: "类型", name: "type", newline: true,  type: "text", editor:{readonly:true},  width:275, validate:{required:true}},
						//{display: "型号", name: "model", newline: true,  type: "text", width:275},
						//{display: "读数", name: "counter", newline: true,  type: "digits", width:70},
						//{display: "生产厂家", name: "manufacturer", newline: true,  type: "text", width:275},
						//{display: "组装图号", name: "assembly_graph", newline: true,  type: "text", width:275}
					//];
					flds = g_base_flds_5;
					var metal = tower['properties']['metals'][o['idx']-1];
					for(var k in metal)
					{
						formdata[k] = metal[k];
					}
				}
				
				$('#form_tower_info_metal').webgisform(flds, {prefix:'tower_metal_'});
				$('#form_tower_info_metal').webgisform('setdata', formdata);
			}
		}
	});
	
}



function GetGeojsonFromPosition(ellipsoid, position, type)
{
	if(position instanceof Cesium.Cartesian3)
	{
		var carto = ellipsoid.cartesianToCartographic(position);
		position = [Cesium.Math.toDegrees(carto.longitude), Cesium.Math.toDegrees(carto.latitude)];
	}
	if(position instanceof Array)
	{
		for(var i in position)
		{
			position[i] = GetGeojsonFromPosition(ellipsoid, position[i]);
		}
		if(type && type === 'Polygon')
		{
			var position1 = [];
			position.push(position[0]);
			position1.push(position);
			position = position1;
		}
	}
	return position;
}

function BufferCreate(viewer, type, position, distance, style, resolution, callback)
{

	var ellipsoid = viewer.scene.globe.ellipsoid;
	var t = 'Point';
	if(type.indexOf('polyline')>-1)
	{
		t = 'LineString';
	}
	if(type.indexOf('polygon')>-1) 
	{
		t = 'Polygon';
	}
	coordinates = GetGeojsonFromPosition(ellipsoid, position, t);
	//console.log(coordinates);
	var res = 4;
	if(resolution) res = resolution;
	var geojson = {type:'Feature',geometry:{type:t, coordinates: coordinates}};
	var cond = {'db':g_db_name, 'collection':'-', 'action':'buffer', 'data':geojson, 'distance':distance, 'res':res};
	ShowProgressBar(true, 670, 200, '生成缓冲区', '正在生成缓冲区，请稍候...');
	MongoFind(cond, function(data){
		ShowProgressBar(false);
		if(data.length>0)
		{
			var geometry = data[0];
			geojson['geometry'] = geometry;
			geojson['_id'] = 'tmp_buffer';
			if(!geojson['properties'])
			{
				geojson['properties'] = {};
			}
			geojson['properties']['webgis_type'] = 'polygon_buffer';
			if(style) geojson['properties']['style'] = style;
			g_geojsons[geojson['_id']] = geojson;
			g_czmls[geojson['_id']] = CreateCzmlFromGeojson(g_geojsons[geojson['_id']]);
			ReloadCzmlDataSource(viewer, g_zaware);
			if(callback) callback(geojson);
		}else
		{
			ShowMessage(400, 250, '出错了', '服务器生成缓冲区错误:返回数据为空,请确认服务正在运行.');
		}
	});
}

function BufferAnalyze(viewer, geojson, webgis_type, callback)
{
	var cond = {'db':g_db_name, 'collection':'features', 'action':'within', 'data':geojson, 'webgis_type':webgis_type, 'limit':0};
	ShowProgressBar(true, 670, 200, '缓冲区分析中', '正在生成缓冲区分析，请稍候...');
	MongoFind(cond, function(data){
		ShowProgressBar(false);
		if(callback) callback(data);
	});
}

function ShowBufferAnalyzeDialog(viewer, type, position)
{
	var ellipsoid = viewer.scene.globe.ellipsoid;
	var buffer_geojson;
	var switch_panel = function(formname, dialog)
	{
		$('form[id^=form_buffer_]').parent().css('display', 'none');
		$('#' + formname).parent().css('display', 'block');
		
		var buttons = bind_buttons(formname, dialog);
	};
	var get_style = function()
	{
		var data = $('#form_buffer_create').webgisform('getdata');
		return data['style'];
	};
	var get_distance = function()
	{
		var data = $('#form_buffer_create').webgisform('getdata');
		return data['distance'];
	};
	var get_analyze_option = function()
	{
		var r = [];
		$('#form_buffer_analyze').find('input[id^=form_buffer_analyze_]').each(function(){
			var t = $(this).attr('id').replace('form_buffer_analyze_', '');
			if($(this).is(':checked')) r.push(t);
		});
		return r;
	};
	var clear_tmp_buffer = function()
	{
		if(g_geojsons['tmp_buffer']) 
		{
			delete g_geojsons['tmp_buffer'];
			g_geojsons['tmp_buffer'] = undefined;
		}
		if(g_czmls['tmp_buffer']) 
		{
			delete g_czmls['tmp_buffer'];
			g_czmls['tmp_buffer'] = undefined;
			ReloadCzmlDataSource(viewer, g_zaware, true);
		}
	};
	var bind_buttons = function(formname, dialog)
	{
		if(formname === 'form_buffer_create')
		{
			buttons = [
				{ 	text: "下一步", 
					click: function(){ 
						if($('#form_buffer_create').valid())
						{
							var style = get_style();
							BufferCreate(viewer, type, position, get_distance(), style, 8,  function(geojson){
								//console.log(style);
								//console.log(geojson);
								buffer_geojson = geojson;
								switch_panel('form_buffer_analyze', dialog);
								
							});
						}
					}
				},
				//{ 	text: "清空", 
					//click: function(){
						//clear_tmp_buffer();
					//}
				//},
				{ 	text: "关闭", 
					click: function(){
						clear_tmp_buffer();
						$( dialog ).dialog( "close" );
					}
				}
			];
		}
		else if(formname === 'form_buffer_analyze')
		{
			buttons = [
				{ 	text: "上一步", 
					click: function(){
						clear_tmp_buffer();
						buffer_geojson = undefined;
						switch_panel('form_buffer_create', dialog);
					}
				},
				{ 	text: "分析", 
					click: function(){ 
						if(buffer_geojson)
						{
							//console.log(buffer_geojson);
							//console.log(get_analyze_option());
							BufferAnalyze(viewer, buffer_geojson, get_analyze_option(), function(data){
								//console.log(data);
								if(data.length>0)
								{
									for(var i in data)
									{
										var g = data[i];
										//console.log(g);
										if(!g_geojsons[g['_id']]) g_geojsons[g['_id']] = AddTerrainZOffset(g);
										if(!g_czmls[g['_id']]) g_czmls[g['_id']] = CreateCzmlFromGeojson(g_geojsons[g['_id']]);
									}
									ReloadCzmlDataSource(viewer, g_zaware);
								}
							});
						}
					}
				},
				{ 	text: "保存", 
					click: function(){
						ShowConfirm(null, 500, 200,
							'保存确认',
							'确认保存吗? 确认的话该缓冲区域将会提交到服务器上，以便所有人都能利用该缓冲区做分析。',
							function(){
								clear_tmp_buffer();
							},
							function(){
								clear_tmp_buffer();
							}
						);
					}
				},
				{ 	text: "关闭", 
					click: function(){
						clear_tmp_buffer();
						$( dialog ).dialog( "close" );
					}
				}
			];
		}
		$('#dlg_buffer_analyze').dialog("option", "buttons", buttons);
	};
	
	
	var dialog = $('#dlg_buffer_analyze').dialog({
		width: 500,
		height: 550,
		minWidth:200,
		minHeight: 200,
		draggable: true,
		resizable: true, 
		modal: false,
		position:{at: "right center"},
		title:'缓冲区分析',
		
		show: {
			effect: "slide",
			direction: "right",
			duration: 400
		},
		hide: {
			effect: "slide",
			direction: "right",
			duration: 400
		}		
	});
	var flds = [	
		{ display: "距离(米)", id: "distance", defaultvalue:2000, newline: true,  type: "spinner", step:1, min:10,max:20000, group:'参数', width:250,labelwidth:90, validate:{required:true, number: true, range:[10, 20000]}},
		{ display: "填充颜色", id: "fill_color", defaultvalue:GetDefaultStyleValue('polygon_buffer', 'color'), newline: false,  type: "color", group:'样式', width:50, labelwidth:120 },
		{ display: "轮廓颜色", id: "outline_color", defaultvalue:GetDefaultStyleValue('polygon_buffer', 'outlineColor'), newline: false,  type: "color", group:'样式', width:50, labelwidth:120 },
		{ display: "标签颜色", id: "label_fill_color",  defaultvalue:GetDefaultStyleValue('polygon_buffer', 'labelFillColor'), newline: true,  type: "color", group:'样式', width:50, labelwidth:120 },
		//{ display: "标签尺寸", id: "label_scale", defaultvalue:GetDefaultStyleValue('polygon_buffer', 'labelScale'), newline: true,  type: "spinner", step:1, min:1,max:5, group:'样式', width:70, labelwidth:120, validate:{number: true, required:true} }
	];
	
	$('#form_buffer_create').webgisform(flds, 
		{
			prefix:'form_buffer_create_', 
			divorspan:'div',
			maxwidth:400
	});
	var flds1 = [	
		{ display: "杆塔", id: "point_tower", defaultvalue:true, newline: false,  type: "checkbox", group:'地标', width:32,labelwidth:90},
		{ display: "地标", id: "point_marker", defaultvalue:true, newline: false,  type: "checkbox", group:'地标', width:32,labelwidth:90},
		{ display: "隐患点", id: "point_hazard", defaultvalue:true, newline: false,  type: "checkbox", group:'地标', width:32,labelwidth:90},
		{ display: "地市", id: "point_subcity", defaultvalue:false, newline: false,  type: "checkbox", group:'地点', width:32,labelwidth:90},
		{ display: "区县", id: "point_county", defaultvalue:false, newline: false,  type: "checkbox", group:'地点', width:32,labelwidth:90},
		{ display: "乡镇", id: "point_town", defaultvalue:false, newline: true,  type: "checkbox", group:'地点', width:32,labelwidth:90},
		{ display: "村寨", id: "point_village", defaultvalue:false, newline: false,  type: "checkbox", group:'地点', width:32,labelwidth:90}
	];
	
	$('#form_buffer_analyze').webgisform(flds1, 
		{
			prefix:'form_buffer_analyze_', 
			divorspan:'span',
			maxwidth:400
	});
	switch_panel('form_buffer_create', dialog);

}


function ShowDNAddDialog(viewer)
{
	var ellipsoid = viewer.scene.globe.ellipsoid;
	$('#dlg_dn_create').dialog({
		width: 500,
		height: 550,
		minWidth:200,
		minHeight: 200,
		draggable: true,
		resizable: true, 
		modal: false,
		position:{at: "right center"},
		title:'创建配电网络',
		
		show: {
			effect: "slide",
			direction: "right",
			duration: 400
		},
		hide: {
			effect: "slide",
			direction: "right",
			duration: 400
		},		
		buttons:[
			{ 	text: "保存", 
				click: function(){ 
					if($('#form_dn_create').valid())
					{
						var that = this;
						ShowConfirm(null, 500, 200,
							'保存确认',
							'确认保存吗? 确认的话数据将会提交到服务器上，以便所有人都能看到修改的结果。',
							function(){
								SaveDN(viewer, function(){
									$( that ).dialog( "close" );
								});
							},
							function(){
								$( that ).dialog( "close" );
							}
						);
					}
				}
			},
			{ 	text: "关闭", 
				click: function(){ 
					$( this ).dialog( "close" );
				}
			}
		]
	});
	
	var flds = [
		{ display: "名称", id: "name", newline: true,  type: "text", group:'信息', width:250,labelwidth:90, validate:{required:true,minlength: 1}}
	];
	$("#form_dn_create" ).webgisform(flds, {
			divorspan:"div",
			prefix:"form_dn_create_",
			maxwidth:400
			//margin:10,
			//groupmargin:10
	});
}

function GetPropertiesByTwoNodes(viewer, id0, id1)
{
	var ret;
	//var scene = viewer.scene;
	for(var i in g_geometry_segments)
	{
		var g = g_geometry_segments[i];
		if(g.start == id0 && g.end == id1)
		{
			ret = g.properties;
			break;
		}
	}
	return ret
}

function SaveDNEdge(viewer, id, callback)
{
	
	if(g_dn_connect_mode 
	&& g_selected_obj 
	&& g_czmls[g_selected_obj.id] 
	&& g_czmls[g_selected_obj.id]['webgis_type'] === 'point_dn' 
	&& g_prev_selected_obj 
	&& g_czmls[g_prev_selected_obj.id] 
	&& g_czmls[g_prev_selected_obj.id]['webgis_type'] === 'point_dn')
	{
		var geojson = {};
		geojson['_id'] = id;
		geojson['properties'] = GetPropertiesByTwoNodes(viewer, g_prev_selected_obj.id, g_selected_obj.id);
		var cond = {'db':g_db_name, 'collection':'edges', 'action':'save', 'data':geojson};
		ShowProgressBar(true, 670, 200, '保存中', '正在保存，请稍候...');
		MongoFind(cond, function(data1){
			ShowProgressBar(false);
			if(callback) callback(data1);
		});
	}
}

function SaveDN(viewer, callback)
{
	var data = $("#form_dn_create" ).webgisform('getdata');
	var geojson = {};
	geojson['_id'] = null;
	geojson['properties'] = {};
	geojson['properties']['webgis_type'] = 'polyline_dn';
	for (var k in data)
	{
		geojson['properties'][k] = data[k];
	}
	var cond = {'db':g_db_name, 'collection':'distribute_network', 'action':'save', 'data':geojson};
	ShowProgressBar(true, 670, 200, '保存中', '正在保存，请稍候...');
	MongoFind(cond, function(data1){
		ShowProgressBar(false);
		if(data1.length>0)
		{
			$.jGrowl("保存成功", { 
				life: 2000,
				position: 'bottom-right', //top-left, top-right, bottom-left, bottom-right, center
				theme: 'bubblestylesuccess',
				glue:'before'
			});
		}else
		{
			$.jGrowl("保存失败", { 
				life: 2000,
				position: 'bottom-right', //top-left, top-right, bottom-left, bottom-right, center
				theme: 'bubblestylefail',
				glue:'before'
			});
		}
		if(callback) callback(data1);
	});
}

function ShowPoiInfoDialog(viewer, title, type, position, id)
{
	var ellipsoid = viewer.scene.globe.ellipsoid;
	$('#dlg_poi_info').dialog({
		width: 500,
		height: 550,
		minWidth:200,
		minHeight: 200,
		draggable: true,
		resizable: true, 
		modal: false,
		position:{at: "right center"},
		title:title,
		
		show: {
			effect: "slide",
			direction: "right",
			duration: 400
		},
		hide: {
			effect: "slide",
			direction: "right",
			duration: 400
		},		
		buttons:[
			{ 	text: "缓冲区分析", 
				click: function(){ 
					$( this ).dialog( "close" );
					ShowBufferAnalyzeDialog(viewer, type, position);
				}
			},
			{ 	text: "保存", 
				click: function(){
					var that = $(this);
					var v = $('#select_poi_type').val();
					if($('#form_poi_info_' + v).valid())
					{
						ShowConfirm(null, 500, 200,
							'保存确认',
							'确认保存吗? 确认的话数据将会提交到服务器上，以便所有人都能看到修改的结果。',
							function(){
								var data = {};
								data['_id'] = id;
								if(!data['_id'] || data['_id'].length == 0) data['_id'] = null;
								var properties =  $('#form_poi_info_' + v).webgisform('getdata');
								delete properties.id;
								//console.log(properties);

								data['properties'] = properties;
								data['properties']['webgis_type'] = v;
								for(var k in data['properties'])
								{
									if(!data['properties'][k] || data['properties'][k].length == 0)
									{
										data['properties'][k] = null;
									}
								}
								var t = 'Point';
								if(v.indexOf('polyline')>-1)
								{
									t = 'LineString';
								}
								if(v.indexOf('polygon')>-1) 
								{
									t = 'Polygon';
								}
								data['geometry'] = {type:t, coordinates:GetGeojsonFromPosition(ellipsoid, position, t)};
								SavePoi(data, function(data1){
									//console.log(data1);
									that.dialog( "close" );
									g_drawhelper.clearPrimitive();
									if(data1 && data1.length>0)
									{
										for(var i in data1)
										{
											var geojson = data1[i];
											var id = geojson['_id'];
											if(!g_geojsons[id])
											{
												g_geojsons[id] = AddTerrainZOffset(geojson);
											}
											if(!g_czmls[id])
											{
												g_czmls[id] = CreateCzmlFromGeojson(g_geojsons[id]);
											}
										}
										ReloadCzmlDataSource(viewer, g_zaware);
									}
								});
							},
							function(){
							
							}
						);
					}
				}
			},
			{ 	text: "关闭", 
				click: function(){ 
					$( this ).dialog( "close" );
				}
			}
		
		]
	});
	
	var poitypelist = [];
	$('#select_poi_type').empty();
	if(type == 'point')
	{
		poitypelist = [
			{value:'point_marker',label:'普通地标'},
			{value:'point_hazard',label:'隐患点'},
			{value:'point_tower',label:'杆塔'},
			{value:'point_dn',label:'配电网设备'}
		];
	}
	if(type == 'polyline')
	{
		poitypelist = [{value:'polyline_marker',label:'路线'},{value:'polyline_hazard',label:'线状隐患源'}];
	}
	if(type == 'polygon')
	{
		poitypelist = [{value:'polygon_marker',label:'区域'},{value:'polygon_hazard',label:'区域隐患源'}];
	}
		
	for(var i in poitypelist)
	{
		$('#select_poi_type').append('<option value="' + poitypelist[i]['value'] + '">' + poitypelist[i]['label'] + '</option>');
	}
	var auto = $('#select_poi_type').autocomplete({
		//position: { my: "left top", at: "left bottom", collision: "none" },
		autoFocus: false,
		source:poitypelist,
	});
	
	$("form[id^=form_poi_info_]").empty();
	var webformlist = BuildPoiForms();
	$("form[id^=form_poi_info_]").parent().css('display','none');
	$("#form_poi_info_" + type + "_marker").parent().css('display','block');
	//$("#form_poi_info_point_marker").validate();
	$( "#select_poi_type" ).on( "change", function( event) {
		$("form[id^=form_poi_info_]").parent().css('display','none');
		var v = event.target.value;
		webformlist[v].parent().css('display','block');
	});	
}

function CreateCzmlFromGeojson(geojson)
{
	var ret;
	var t = geojson['geometry']['type'];
	if(t === 'Point')
		ret = CreatePointCzmlFromGeojson(geojson);
	if(t === 'LineString' || t === 'MultiLineString')
		ret = CreatePolyLineCzmlFromGeojson(geojson);
	if(t === 'Polygon')
		ret = CreatePolygonCzmlFromGeojson(geojson);
	return ret;
}

function BuildPoiForms()
{
	var ret = {};
	var vlist = ['point_marker', 'point_hazard', 'point_tower', 'point_dn_switch','point_dn_link','point_dn_transform','point_dn_transformarea', 'polyline_marker', 'polyline_hazard', 'polygon_marker', 'polygon_hazard'];
	for(var i in vlist)
	{
		v = vlist[i];
		var fields;
		if(v === "point_tower")
		{
			fields = [
				//{ id: "id", type: "hidden" },
				{ display: "名称", id: "name", newline: true,  type: "text", group:'信息', width:250,labelwidth:90, validate:{required:true,minlength: 1}},
				{ display: "代码", id: "tower_code", newline: true,  type: "text", group:'信息', width:250,labelwidth:90 },
				{ display: "塔型", id: "model_code", newline: true,  type: "text", group:'信息', width:80,labelwidth:90 },
				{ display: "呼称高", id: "denomi_height", newline: true,  type: "spinner", step:0.1, min:0,max:100, group:'信息', width:40, validate:{number: true, range:[0, 100]}},
				//电气
				{ display: "接地电阻", id: "grnd_resistance", newline: true,  type: "spinner", step:0.1, min:0,max:9999, group:'电气', width:250, validate:{number: true, required:false, range:[0, 9999]}},
				//土木
				{ display: "水平档距", id: "horizontal_span", newline: true,  type: "spinner", step:0.1, min:0,max:9999, group:'土木', width:40, validate:{number: true, required:false, range:[0, 9999]} },
				{ display: "垂直档距", id: "vertical_span", newline: true,  type: "spinner", step:0.1, min:0,max:9999, group:'土木', width:40, validate:{number: true, required:false, range:[0, 9999]} }
				//工程
				//{ display: "所属工程", id: "project", newline: true,  type: "text", group:'工程', width:330 }
			];
		}
		if(v === "point_marker")
		{
			fields = [	
				{ display: "显示图标", id: "icon", newline: true,  type: "icon", defaultvalue:"point_marker" ,iconlist:['point_marker', 'point_tower', 'point_hazard'], group:'信息'},
				{ display: "名称", id: "name", newline: true,  type: "text", group:'信息', width:250,labelwidth:90, validate:{required:true,minlength: 1}},
				{ display: "描述", id: "description", newline: true,  type: "text", group:'信息', width:250, labelwidth:90 },
				{ display: "填充颜色", id: "fill_color", defaultvalue:GetDefaultStyleValue(v, 'color'), newline: false,  type: "color", group:'样式', width:50, labelwidth:120 },
				{ display: "轮廓颜色", id: "outline_color", defaultvalue:GetDefaultStyleValue(v, 'outlineColor'), newline: false,  type: "color", group:'样式', width:50, labelwidth:120 },
				{ display: "标签颜色", id: "label_fill_color",  defaultvalue:GetDefaultStyleValue(v, 'labelFillColor'), newline: true,  type: "color", group:'样式', width:50, labelwidth:120 },
				{ display: "尺寸", id: "pixel_size", defaultvalue:GetDefaultStyleValue(v, 'pixelSize'), newline: true,  type: "spinner", step:1, min:1,max:50, group:'样式', width:70, labelwidth:120, validate:{number: true, required:true, range:[1, 50]} },
				{ display: "标签尺寸", id: "label_scale", defaultvalue:GetDefaultStyleValue(v, 'labelScale'), newline: false,  type: "spinner", step:0.1, min:0.1,max:10, group:'样式', width:70, labelwidth:120, validate:{number: true, required:true, range:[0.1, 10]} }
			];
		}
		if(v === "point_hazard")
		{
			fields = [	
				//{ id: "id", type: "hidden" },
				{ display: "显示图标", id: "icon", newline: true,  type: "icon", defaultvalue:"point_marker" ,iconlist:['point_marker', 'point_tower', 'point_hazard'], group:'信息'},
				{ display: "名称", id: "name", newline: true,  type: "text", group:'信息', width:250, validate:{required:true,minlength: 1}},
				{ display: "高度", id: "height", newline: true,  type: "spinner",step:1, min:0,max:9999, group:'信息', width:220, validate:{number: true, range:[0, 9999]} },
				{ display: "描述", id: "description", newline: true,  type: "text", group:'信息', width:250 },
				{ display: "联系人", id: "contact_person", newline: true,  type: "text", group:'信息', width:250 },
				{ display: "发现时间", id: "discover_date", newline: true,  type: "date", group:'信息', width:130 },
				{ display: "填充颜色", id: "fill_color", defaultvalue:GetDefaultStyleValue(v, 'color'), newline: false,  type: "color", group:'样式', width:50, labelwidth:120 },
				{ display: "轮廓颜色", id: "outline_color", defaultvalue:GetDefaultStyleValue(v, 'outlineColor'), newline: false,  type: "color", group:'样式', width:50, labelwidth:120 },
				{ display: "标签颜色", id: "label_fill_color",  defaultvalue:GetDefaultStyleValue(v, 'labelFillColor'), newline: true,  type: "color", group:'样式', width:50, labelwidth:120 },
				{ display: "尺寸", id: "pixel_size", defaultvalue:GetDefaultStyleValue(v, 'pixelSize'), newline: true,  type: "spinner", step:1, min:1,max:50, group:'样式', width:70, labelwidth:120, validate:{number: true, required:true, range:[1, 50]} },
				{ display: "标签尺寸", id: "label_scale", defaultvalue:GetDefaultStyleValue(v, 'labelScale'), newline: true,  type: "spinner", step:0.1, min:0.1,max:10, group:'样式', width:70, labelwidth:120, validate:{number: true, required:true, range:[0.1, 10]} }
			];
		}
		if(v.indexOf("point_dn_")>-1)
		{
			var function_list = [];
			//console.log(g_codes['functional_type']);
			for(var k in g_codes['functional_type'])
			{
				
				if(k == 'PAE' || k == 'PAB' || k == 'PLM')
				{
					function_list.push({value:k, label:g_codes['functional_type'][k]});
				}
			}
			function_list.push({value:'T', label:'变压器区域'});
			fields = [	
				//{ id: "id", type: "hidden" },
				{ display: "显示图标", id: "icon", defaultvalue:"point_dn_switch", newline: true,  type: "icon", defaultvalue:"point_marker" ,iconlist:['point_marker', 'point_tower', 'point_hazard','point_dn_switch','point_dn_link','point_dn_transform','point_dn_transformarea'], group:'信息'},
				{ display: "名称", id: "name", newline: true,  type: "text", group:'信息', width:250, validate:{required:true,minlength: 1}},
				{ display: "功能分类", id: "function_type", newline: true,  type: "select",editor: {data:function_list}, group:'电气特性', width:250, validate:{required:true,minlength: 1}},
				{ display: "填充颜色", id: "fill_color", defaultvalue:GetDefaultStyleValue(v, 'color'), newline: false,  type: "color", group:'样式', width:50, labelwidth:120 },
				{ display: "轮廓颜色", id: "outline_color", defaultvalue:GetDefaultStyleValue(v, 'outlineColor'), newline: false,  type: "color", group:'样式', width:50, labelwidth:120 },
				{ display: "标签颜色", id: "label_fill_color",  defaultvalue:GetDefaultStyleValue(v, 'labelFillColor'), newline: true,  type: "color", group:'样式', width:50, labelwidth:120 },
				{ display: "尺寸", id: "pixel_size", defaultvalue:GetDefaultStyleValue(v, 'pixelSize'), newline: true,  type: "spinner", step:1, min:1,max:50, group:'样式', width:70, labelwidth:120, validate:{number: true, required:true, range:[1, 50]} },
				{ display: "标签尺寸", id: "label_scale", defaultvalue:GetDefaultStyleValue(v, 'labelScale'), newline: true,  type: "spinner", step:0.1, min:0.1,max:10, group:'样式', width:70, labelwidth:120, validate:{number: true, required:true, range:[0.1, 10]} }
			];
		}
		if(v === "polyline_marker")
		{
			fields = [	
				{ display: "名称", id: "name", newline: true,  type: "text", group:'信息', width:250,labelwidth:90, validate:{required:true,minlength: 1}},
				{ display: "描述", id: "description", newline: true,  type: "text", group:'信息', width:250, labelwidth:90 },
				{ display: "填充颜色", id: "fill_color", defaultvalue:GetDefaultStyleValue(v, 'color'), newline: false,  type: "color", group:'样式', width:50, labelwidth:120 },
				//{ display: "轮廓颜色", id: "outline_color", defaultvalue:GetDefaultStyleValue(v, 'outlineColor'), newline: true,  type: "color", group:'样式', width:50, labelwidth:120 },
				{ display: "标签颜色", id: "label_fill_color",  defaultvalue:GetDefaultStyleValue(v, 'labelFillColor'), newline: true,  type: "color", group:'样式', width:50, labelwidth:120 },
				{ display: "宽度", id: "pixel_width", defaultvalue:GetDefaultStyleValue(v, 'pixelWidth'), newline: true,  type: "spinner", step:1, min:1,max:50, group:'样式', width:70, labelwidth:120, validate:{number: true, required:true, range:[1, 50]} },
				{ display: "标签尺寸", id: "label_scale", defaultvalue:GetDefaultStyleValue(v, 'labelScale'), newline: true,  type: "spinner", step:0.1, min:0.1,max:10, group:'样式', width:70, labelwidth:120, validate:{number: true, required:true, range:[0.1, 10]} }
			];
		}
		if(v === "polyline_hazard")
		{
			fields = [	
				{ display: "名称", id: "name", newline: true,  type: "text", group:'信息', width:250, validate:{required:true,minlength: 1}},
				{ display: "高度", id: "height", newline: true,  type: "spinner",step:1, min:0,max:9999, group:'信息', width:220, validate:{number: true, range:[0, 9999]} },
				{ display: "描述", id: "description", newline: true,  type: "text", group:'信息', width:250 },
				{ display: "联系人", id: "contact_person", newline: true,  type: "text", group:'信息', width:250 },
				{ display: "发现时间", id: "discover_date", newline: true,  type: "date", group:'信息', width:130 },
				{ display: "填充颜色", id: "fill_color", defaultvalue:GetDefaultStyleValue(v, 'color'), newline: false,  type: "color", group:'样式', width:50, labelwidth:120 },
				//{ display: "轮廓颜色", id: "outline_color", defaultvalue:GetDefaultStyleValue(v, 'outlineColor'), newline: true,  type: "color", group:'样式', width:50, labelwidth:120 },
				{ display: "标签颜色", id: "label_fill_color",  defaultvalue:GetDefaultStyleValue(v, 'labelFillColor'), newline: true,  type: "color", group:'样式', width:50, labelwidth:120 },
				{ display: "宽度", id: "pixel_width", defaultvalue:GetDefaultStyleValue(v, 'pixelWidth'), newline: true,  type: "spinner", step:1, min:1,max:50, group:'样式', width:70, labelwidth:120, validate:{number: true, required:true, range:[1, 50]} },
				{ display: "标签尺寸", id: "label_scale", defaultvalue:GetDefaultStyleValue(v, 'labelScale'), newline: true,  type: "spinner", step:0.1, min:0.1,max:10, group:'样式', width:70, labelwidth:120, validate:{number: true, required:true, range:[0.1, 10]} }
			];
		}
		if(v === "polygon_marker")
		{
			fields = [	
				{ display: "名称", id: "name", newline: true,  type: "text", group:'信息', width:250,labelwidth:90, validate:{required:true,minlength: 1}},
				{ display: "描述", id: "description", newline: true,  type: "text", group:'信息', width:250, labelwidth:90 },
				{ display: "填充颜色", id: "fill_color", defaultvalue:GetDefaultStyleValue(v, 'color'), newline: false,  type: "color", group:'样式', width:50, labelwidth:120 },
				{ display: "轮廓颜色", id: "outline_color", defaultvalue:GetDefaultStyleValue(v, 'outlineColor'), newline: false,  type: "color", group:'样式', width:50, labelwidth:120 },
				{ display: "标签颜色", id: "label_fill_color",  defaultvalue:GetDefaultStyleValue(v, 'labelFillColor'), newline: true,  type: "color", group:'样式', width:50, labelwidth:120 },
				{ display: "标签尺寸", id: "label_scale", defaultvalue:GetDefaultStyleValue(v, 'labelScale'), newline: true,  type: "spinner", step:0.1, min:0.1,max:10, group:'样式', width:70, labelwidth:120, validate:{number: true, required:true, range:[0.1, 10]} }
			];
		}
		if(v === "polygon_hazard")
		{
			fields = [	
				{ display: "名称", id: "name", newline: true,  type: "text", group:'信息', width:250, validate:{required:true,minlength: 1}},
				{ display: "高度", id: "height", newline: true,  type: "spinner",step:1, min:0,max:9999, group:'信息', width:220, validate:{number: true, range:[0, 9999]} },
				{ display: "描述", id: "description", newline: true,  type: "text", group:'信息', width:250 },
				{ display: "联系人", id: "contact_person", newline: true,  type: "text", group:'信息', width:250 },
				{ display: "发现时间", id: "discover_date", newline: true,  type: "date", group:'信息', width:130 },
				{ display: "填充颜色", id: "fill_color", defaultvalue:GetDefaultStyleValue(v, 'color'), newline: false,  type: "color", group:'样式', width:50, labelwidth:120 },
				{ display: "轮廓颜色", id: "outline_color", defaultvalue:GetDefaultStyleValue(v, 'outlineColor'), newline: false,  type: "color", group:'样式', width:50, labelwidth:120 },
				{ display: "标签颜色", id: "label_fill_color",  defaultvalue:GetDefaultStyleValue(v, 'labelFillColor'), newline: true,  type: "color", group:'样式', width:50, labelwidth:120 },
				{ display: "标签尺寸", id: "label_scale", defaultvalue:GetDefaultStyleValue(v, 'labelScale'), newline: true,  type: "spinner", step:0.1, min:0.1,max:10, group:'样式', width:70, labelwidth:120, validate:{number: true, required:true, range:[0.1, 10]} }
			];
		}
		var webgis_type = v;
		if(v.indexOf('point_dn_')>-1)
		{
			webgis_type = 'point_dn';
		}
		if(!ret[webgis_type] && fields)
		{
			ret[webgis_type] = $("#form_poi_info_" + webgis_type).webgisform(fields, {
					divorspan:"span",
					prefix:"form_poi_info_" + webgis_type + '_',
					maxwidth:400
					//margin:10,
					//groupmargin:10
				});
		}
		
	}
	return ret;
}


function CheckPoiInfoModified()
{
	
	return false;

}



function GetSegmentsByTowerStartEnd(start_id, end_ids)
{
	var ret = [];
	
	for(var i in end_ids)
	{
		var end_id = end_ids[i];
		for(var j in g_segments)
		{
			var seg = g_segments[j];
			if(seg['start_tower'] == start_id && seg['end_tower'] == end_id)
			{
				ret.push(seg);
				break;
			}
		}
	}
	
	return ret;
}

function CheckModelCode(modelcode)
{
	var ret = false;
	for(var i in g_models)
	{
		if (g_models[i] == modelcode)
		{
			ret = true;
			break;
		}
	}
	return ret;
}

function RePositionPoint(viewer, id, lng, lat, height, rotate)
{
	if(g_czmls[id] && $.isNumeric(lng) && $.isNumeric(lat) && $.isNumeric(height) && $.isNumeric(rotate))
	{
		g_czmls[id]['position']['cartographicDegrees'] = [parseFloat(lng), parseFloat(lat), parseFloat(height)];
		ReloadCzmlDataSource(viewer, g_zaware);
	}
}

function PositionModel(ellipsoid, model, lng, lat, height, rotate)
{
	if($.isNumeric(lng) && $.isNumeric(lat) && $.isNumeric(height) && $.isNumeric(rotate))
	{
		var cart3 = ellipsoid.cartographicToCartesian(Cesium.Cartographic.fromDegrees(parseFloat(lng), parseFloat(lat), parseFloat(height)));
		var modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(cart3);
		var quat = Cesium.Quaternion.fromAxisAngle(Cesium.Cartesian3.UNIT_Z, Cesium.Math.toRadians(rotate - 90));
		var mat3 = Cesium.Matrix3.fromQuaternion(quat);
		var mat4 = Cesium.Matrix4.fromRotationTranslation(mat3, Cesium.Cartesian3.ZERO);
		var m = Cesium.Matrix4.multiplyTransformation(modelMatrix, mat4, mat4);
		model.modelMatrix = m;
	}

}


function GetProjectNameByTowerId(id)
{
	var ret = '';
	var l = [];
	var _ids = [];
	if(g_geojsons[id])
	{
		_ids.push(id);
	}
	for(var i in g_lines)
	{
		for(var j in _ids)
		{
			if(g_lines[i]['properties']['towers'].indexOf(_ids[j])>-1)
			{
				l.push(g_lines[i]['properties']['name']);
			}
		}
	}
	for(var i in l)
	{
		ret += l[i] + ',';
	}
	
	return ret;
}

function AddMetal(e)
{
	if(g_selected_obj && g_selected_obj.id && g_geojsons[g_selected_obj.id])
	{
		var tower = g_geojsons[g_selected_obj.id];
		var o = {};
		o['type'] = e.text;
		o['assembly_graph'] = '';
		o['manufacturer'] = '';
		o['model'] = '';
		if(e.text == '绝缘子串')
		{
			o['insulator_type'] = '';
			o['material'] = '';
			o['strand'] = 0;
			o['slice'] = 0;
		}
		if(e.text == '防振锤')
		{
			o['side'] = '';
			o['count'] = 0;
			o['distance'] = 0;
		}
		if(e.text == '接地装置')
		{
			o['count'] = 0;
			o['depth'] = 0;
		}
		if(e.text == '雷电计数器')
		{
			o['counter'] = 0;
		}
		if(e.text == '防鸟刺' || e.text == '在线监测装置' || e.text == '拉线')
		{
			o['count'] = 0;
		}
		if(e.text == '基础')
		{
			o['count'] = 0;
			o['platform_model'] = '';
			o['anchor_model'] = '';
			o['depth'] = 0;
		}
		tower['properties']['metals'].push(o);
		var data = [];
		var idx = 1;
		for(var i in tower['properties']['metals'])
		{
			data.push({
				'idx':idx, 
				'type':tower['properties']['metals'][i]['type'],
				'model':tower['properties']['metals'][i]['model']
				});
			idx += 1;
		}
		g_selected_metal_item = undefined;
		$("#listbox_tower_info_metal").ligerListBox().setData(data);
		
	}
}

function DeleteMetal()
{
	if(g_selected_obj &&  g_selected_obj.id && g_geojsons[g_selected_obj.id])
	{
		var tower = g_geojsons[g_selected_obj.id];
		if(g_selected_metal_item)
		{
			var o = g_selected_metal_item;
			tower['properties']['metals'].splice(o['idx']-1, 1);
		}
		var data = [];
		var idx = 1;
		for(var i in tower['properties']['metals'])
		{
			data.push({
				'idx':idx, 
				'type':tower['properties']['metals'][i]['type'],
				'model':tower['properties']['metals'][i]['model']
				});
			idx += 1;
		}
		g_selected_metal_item = undefined;
		$("#listbox_tower_info_metal").ligerListBox().setData(data);
	}
}



