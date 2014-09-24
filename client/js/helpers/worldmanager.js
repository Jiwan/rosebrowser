'use strict';

// TODO: Do something with ZONE_TABLE, maybe even $.extend(DataTable)
var ZONE_TABLE = {
  NAME: 0, // STR
  FILE: 1, // STR
  START_POS: 2, // STR
  REVIVE_POS: 3, // STR
  IS_UNDERGROUND: 4, // INT
  BG_MUSIC_DAY: 5, // STR
  BG_MUSIC_NIGHT: 6, // STR
  BG_IMAGE: 7, // INT
  MINIMAP_NAME: 8, // STR
  MINIMAP_STARTX: 9, // INT
  MINIMAP_STARTY: 10, // INT
  OBJECT_TABLE: 11, // STR
  CNST_TABLE: 12, // STR
  DAY_CYCLE: 13, // INT
  MORNING_TIME: 14, // INT
  DAY_TIME: 15, // INT
  EVENING_TIME: 16, // INT
  NIGHT_TIME: 17, // INT
  PVP_STATE: 18, // INT
  PLANET_NO: 19, // INT
  TYPE: 20, // INT
  CAMERA_TYPE: 21, // INT
  JOIN_TRIGGER: 22, // STR
  KILL_TRIGGER: 23, // STR
  DEAD_TRIGGER: 24, // STR
  SECTOR_SIZE: 25, // INT
  STRING_ID: 26, // STR
  WEATHER_TYPE: 27, // INT
  PARTY_EXP_A: 28, // INT
  PARTY_EXP_B: 29, // INT
  RIDING_REFUSE_FLAG: 30, // INT
  REVIVE_ZONENO: 31, // INT
  REVIVE_X_POS: 32, // INT
  REVIVE_Y_POS: 33 // INT
};

function tileRotateUvs(tile, uv) {
  switch(tile.rotation) {
    case Zone.TILE_ROTATION.FLIP_HORIZONTAL:
      uv.x = 1.0 - uv.x;
      break;
    case Zone.TILE_ROTATION.FLIP_VERTICAL:
      uv.y = 1.0 - uv.y;
      break;
    case Zone.TILE_ROTATION.FLIP_BOTH:
      uv.x = 1.0 - uv.x;
      uv.y = 1.0 - uv.y;
      break;
    case Zone.TILE_ROTATION.CLOCKWISE_90:
      var tmp = uv.x;
      uv.x = uv.y;
      uv.y = tmp;
      break;
    case Zone.TILE_ROTATION.COUNTER_CLOCKWISE_90:
      var tmp = uv.x;
      uv.x = uv.y;
      uv.y = 1.0 - tmp;
      break;
  }
  return uv;
}


function WorldManager() {
  this.rootObj = new THREE.Object3D();
  this.octree = new THREE.Octree({
    depthMax: Infinity,
    objectsThreshold: 8,
    overlapPct: 0.15,
    undeferred: true
  });
  this.isLoaded = false;
  this.cnstModelMgr = null;
  this.decoModelMgr = null;
  this.basePath = null;
  this.chunks = {};
  this.terChunks = [];
  this.objects = [];
  this.colObjects = [];
  this.zoneInfo = null;
  this.viewDistSq = Math.pow(300, 2);
  this.DM = new DataManager();
}

WorldManager.prototype.update = function(delta) {
  OceanBlock.update(delta);
};

WorldManager.prototype.addToScene = function() {
  scene.add(this.rootObj);
  this.rootObj.updateMatrixWorld(true);
};

WorldManager.prototype.removeFromScene = function() {
  scene.remove(this.rootObj);
};

// Returns the closest picked object.
WorldManager.prototype.rayPick = function(rayCaster) {
  //var octreeObjects = this.octree.search( caster.ray.origin, caster.ray.far, true, caster.ray.direction );
  //var inters = caster.intersectOctreeObjects( octreeObjects );
  var inters = rayCaster.intersectObjects( this.colObjects, true );
  if (inters.length > 0) {
    return inters[0];
  }
  return null;
};

WorldManager.prototype.findHighPoint = function(x, y, fromZ) {
  if (fromZ === undefined) {
    fromZ = 1000; // From the Sky!!
  }

  var caster = new THREE.Raycaster(new THREE.Vector3(x, y, fromZ), new THREE.Vector3(0, 0, -1));
  var pickInfo = this.rayPick(caster);
  if (pickInfo) {
    return pickInfo.point.z;
  }
  return undefined;
};

function getMapBounds(mapBasePath) {
  var boundsName = mapBasePath.toUpperCase();
  boundsName = boundsName.substr("3DDATA\\MAPS\\".length);
  boundsName = boundsName.substr(0, boundsName.length - 1);
  boundsName = boundsName.replace('\\', '/');
  return MAP_BOUNDS[boundsName];
}
WorldManager.prototype.setMap = function(mapIdx, callback) {
  var self = this;
  self.textures = [];

  GDM.get('list_zone', function (zoneTable) {
    var mapRow = zoneTable.rows[mapIdx];

    self.DM.register('cnstmdls', ModelListManager, mapRow[ZONE_TABLE.CNST_TABLE]);
    self.DM.register('decomdls', ModelListManager, mapRow[ZONE_TABLE.OBJECT_TABLE]);
    self.DM.register('zoneinfo', Zone, mapRow[ZONE_TABLE.FILE]);
    self.DM.get('zoneinfo', 'cnstmdls', 'decomdls',  function(zone, cnstMdls, decoMdls) {
      var lastPathSlash = mapRow[ZONE_TABLE.FILE].lastIndexOf('\\');
      self.basePath = mapRow[ZONE_TABLE.FILE].substr(0, lastPathSlash + 1);
      self.zoneInfo = zone;
      self.cnstModelMgr = cnstMdls;
      self.decoModelMgr = decoMdls;

      var chunkBounds = getMapBounds(self.basePath);
      var chunkSX = chunkBounds[0][0];
      var chunkEX = chunkBounds[0][1];
      var chunkSY = chunkBounds[1][0];
      var chunkEY = chunkBounds[1][1];

      for (var iy = chunkSY; iy <= chunkEY; ++iy) {
        for (var ix = chunkSX; ix <= chunkEX; ++ix) {
          // ROSE uses 64, mind as well use 100 so its easier to read...
          self.chunks[ix*100+iy] = new WorldChunk(self, ix, iy);
        }
      }

      self.isLoaded = true;
      callback();
    });
  });
};

/**
 * Causes the world to update which chunks need to be visible for this
 * particular camera/player position.
 *
 * @param {THREE.Vector3|null} pos The position of the viewer, or null to load the whole map
 * @param {Function} [callback] Callback to invoke when all close chunks are loaded
 */
WorldManager.prototype.setViewerInfo = function(pos, callback) {
  if (!this.isLoaded) {
    console.warn('Attempted to load chunks before map was finished loading.');
    if (callback) {
      callback();
    }
    return;
  }

  var localViewPos = null;
  if (pos) {
    // TODO: Fix this, this is dumb.
    localViewPos = pos.clone().sub(this.rootObj.position);
  }

  var waitAll = new MultiWait();
  for (var chunkIdx in this.chunks) {
    if (this.chunks.hasOwnProperty(chunkIdx)) {
      var chunk = this.chunks[chunkIdx];
      if (localViewPos) {
        var chunkDelta = localViewPos.clone().sub(chunk.position);
        chunkDelta.z = 0; // We don't care about the Z distance for here
        if (chunkDelta.lengthSq() <= this.viewDistSq) {
          chunk.load(waitAll.one());
        } else {
          chunk.markNotNeeded();
        }
      } else {
        chunk.load(waitAll.one());
      }
    }
  }
  waitAll.wait(callback);
};

var OceanBlock = function(start, end) {
  this.start = start.clone();
  this.end = end.clone();
  this.start.multiplyScalar(ZZ_SCALE_IN);
  this.end.multiplyScalar(ZZ_SCALE_IN);
};

OceanBlock._material = null;

OceanBlock.update = function(delta) {
  if (OceanBlock._material) {
    var max = OceanBlock._material.textureList.length;
    var index = Math.floor((new Date().getTime()) / 100) % max;
    var frame = OceanBlock._material.textureList[index];
    OceanBlock._material.uniforms.texture1.value = frame;
  }
};

OceanBlock._loadMaterial = function() {
  var mat = ShaderManager.get('water').clone();
  mat.transparent = true;
  mat.blending = THREE.AdditiveBlending;
  mat.blendSrc = THREE.SrcAlphaFactor;
  mat.blendDst = THREE.OneFactor;
  mat.blendEquation = THREE.AddEquation;
  mat.textureList = [];

  for (var i = 1; i <= 25; ++i) {
    var texture, path;
    path = String(i);

    if (path.length < 2) {
      path = '0' + path;
    }

    path = '3Ddata\\JUNON\\WATER\\OCEAN01_' + path + '.DDS';

    texture = RoseTextureManager.load(path);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    mat.textureList.push(texture);
  }

  mat.uniforms = {
    texture1: { type: 't', value: mat.textureList[0] }
  };

  return mat;
};

OceanBlock.prototype.load = function() {
  var verts = new Float32Array(3 * 4);
  verts[0] = this.start.x;
  verts[1] = this.start.y;
  verts[2] = this.start.z;

  verts[3] = this.end.x;
  verts[4] = this.start.y;
  verts[5] = this.start.z;

  verts[6] = this.end.x;
  verts[7] = this.end.y;
  verts[8] = this.start.z;

  verts[9] = this.start.x;
  verts[10] = this.end.y;
  verts[11] = this.start.z;

  var uv1 = new Float32Array(2 * 4);
  uv1[0] = this.start.x / 16.0;
  uv1[1] = this.start.y / 16.0;

  uv1[2] = this.end.x / 16.0;
  uv1[3] = this.start.y / 16.0;

  uv1[4] = this.end.x / 16.0;
  uv1[5] = this.end.y / 16.0;

  uv1[6] = this.start.x / 16.0;
  uv1[7] = this.end.y / 16.0;

  var faces = new Uint16Array(3 * 2);
  faces[0] = 0;
  faces[1] = 3;
  faces[2] = 2;

  faces[3] = 2;
  faces[4] = 1;
  faces[5] = 0;

  var geometry = new THREE.BufferGeometry();
  geometry.addAttribute('position', new THREE.BufferAttribute(verts, 3));
  geometry.addAttribute('index', new THREE.BufferAttribute(faces, 3));
  geometry.addAttribute('uv', new THREE.BufferAttribute(uv1, 2));

  geometry.dynamic = false;
  geometry.computeBoundingSphere();
  geometry.computeBoundingBox();
  geometry.computeFaceNormals();
  geometry.computeVertexNormals();

  if (!OceanBlock._material) {
    OceanBlock._material = OceanBlock._loadMaterial();
  }

  return new THREE.Mesh(geometry, OceanBlock._material);
};

function WorldChunk(world, chunkX, chunkY) {
  this.world = world;
  this.name = chunkX + '_' + chunkY;
  this.chunkX = chunkX;
  this.chunkY = chunkY;
  this.textures = {};
  this.lightmapTex = null;
  this.info = null;
  this.heightmap = null;
  this.tilemap = null;
  this.position = new THREE.Vector3((chunkX - 32) * 160, (32 - chunkY) * 160, 0);
  this.isVisible = false;
  this.loadState = 0;
  this.loadWaiters = [];
  this.rootObj = new THREE.Object3D();
}

WorldChunk.prototype._getBlockTile = function(blockX, blockY) {
  var tileIdx = (15-blockY) * 16 + blockX;
  return this.world.zoneInfo.tiles[this.tilemap.map[tileIdx].number];
};

WorldChunk.prototype._createLmOnlyMaterial = function() {
  var newMaterial = ShaderManager.get('terrain_lmonly').clone();
  newMaterial.uniforms = {
    texture1: {type: 't', value: this.lightmapTex}
  };
  return newMaterial;
};

// We don't need to cache the materials here as they are generated on a
//   per-chunk basis.  Additionally, the mesh generator groups all blocks
//   using the same tiles to the same mesh, so this function only is called
//   once.
WorldChunk.prototype._createMaterial = function(texId1, texId2) {
  if (!this.textures[texId1]) {
    this.textures[texId1] = RoseTextureManager.load(this.world.zoneInfo.textures[texId1]);
  }
  var tex1 = this.textures[texId1];

  if (!this.textures[texId2]) {
    this.textures[texId2] = RoseTextureManager.load(this.world.zoneInfo.textures[texId2]);
  }
  var tex2 = this.textures[texId2];

  var newMaterial = ShaderManager.get('terrain').clone();
  newMaterial.texId1 = texId1;
  newMaterial.texId2 = texId2;
  newMaterial.uniforms = {
    texture1: { type: 't', value: tex1 },
    texture2: { type: 't', value: tex2 },
    texture3: { type: 't', value: this.lightmapTex }
  };

  return newMaterial;
};

// Static buffer. This buffer can be the same for all chunks.
WorldChunk.indicesBuffer = null;

WorldChunk.getIndicesBuffer = function() {
  // Lazy creation.
  if (!WorldChunk.indicesBuffer) {
    var blockCountX = 16;
    var blockCountY = 16;

    var blockCount = blockCountX * blockCountY;

    var squarePerAxis  = 4;
    var vertexPerAxis  = squarePerAxis + 1;
    var squarePerBlock = squarePerAxis * squarePerAxis;
    var vertexPerBlock = vertexPerAxis * vertexPerAxis;

    var facePerSquare = 2;
    var indexPerFace  = 3;

    var rawIndicesBuffer = new Uint16Array(blockCount * squarePerBlock*facePerSquare*indexPerFace);


    for (var blockY = 0; blockY < blockCountX; ++blockY) {
      for (var blockX = 0; blockX < blockCountY; ++blockX) {
        var bgbIndex   = blockY * blockCountY + blockX;
        var vertBase   = bgbIndex * vertexPerBlock;
        var squareBase = bgbIndex * squarePerBlock;

        for (var squareY = 0; squareY < squarePerAxis; ++squareY) {
          for (var squareX = 0; squareX < squarePerAxis; ++squareX) {
            var vertex1 = vertBase + (squareY + 0) * vertexPerAxis + (squareX + 0);
            var vertex2 = vertBase + (squareY + 0) * vertexPerAxis + (squareX + 1);
            var vertex3 = vertBase + (squareY + 1) * vertexPerAxis + (squareX + 0);
            var vertex4 = vertBase + (squareY + 1) * vertexPerAxis + (squareX + 1);

            var squareIndex = squareBase + (squareY * squarePerAxis + squareX);
            rawIndicesBuffer[squareIndex*facePerSquare*indexPerFace + 0] = vertex1;
            rawIndicesBuffer[squareIndex*facePerSquare*indexPerFace + 1] = vertex2;
            rawIndicesBuffer[squareIndex*facePerSquare*indexPerFace + 2] = vertex3;
            rawIndicesBuffer[squareIndex*facePerSquare*indexPerFace + 3] = vertex4;
            rawIndicesBuffer[squareIndex*facePerSquare*indexPerFace + 4] = vertex3;
            rawIndicesBuffer[squareIndex*facePerSquare*indexPerFace + 5] = vertex2;
          }
        }
      }
    }
    WorldChunk.indicesBuffer = new THREE.BufferAttribute(rawIndicesBuffer, 3);
  }

  return WorldChunk.indicesBuffer;
};

WorldChunk.prototype._buildTerrainBlock = function(blockX, blockY, bgbIdx, verts, uv0, uv1, uv2) {
  var tile = this._getBlockTile(blockX, blockY);

  var vertBase = bgbIdx * 5 * 5;
  var indexBase = bgbIdx * 4 * 4;

  for (var vy = 0; vy < 5; ++vy) {
    for (var vx = 0; vx < 5; ++vx) {
      var vertIdx = vertBase + (vy * 5 + vx);
      var vertX = blockX * 4 + vx;
      var vertY = 64 - (blockY * 4 + vy);
      verts[vertIdx*3+0] = (blockX * 10) + (vx * 2.5);
      verts[vertIdx*3+1] = (blockY * 10) + (vy * 2.5);
      verts[vertIdx*3+2] = this.heightmap.map[vertY * 65 + vertX] * ZZ_SCALE_IN;
      uv0[vertIdx*2+0] = (vx / 4);
      uv0[vertIdx*2+1] = 1- (vy / 4);
      var tex2Uv = tileRotateUvs(tile, {x:vx/4,y:vy/4});
      uv1[vertIdx*2+0] = tex2Uv.x;
      uv1[vertIdx*2+1] = 1 - tex2Uv.y;
      uv2[vertIdx*2+0] = (vertX / 64);
      uv2[vertIdx*2+1] = (vertY / 64);
    }
  }
};

WorldChunk.prototype._buildTerrain = function() {
  var chunkGrps = [];
  function findChunkGrp(tile) {
    var texId1 = tile.layer1 + tile.offset1;
    var texId2 = tile.layer2 + tile.offset2;
    for (var i = 0; i < chunkGrps.length; ++i) {
      var chunkGrp = chunkGrps[i];
      if (chunkGrp.texId1 === texId1 && chunkGrp.texId2 === texId2) {
        return chunkGrp;
      }
    }

    var newChunkGrp = {
      texId1: texId1,
      texId2: texId2,
      blocks: []
    };
    chunkGrps.push(newChunkGrp);
    return newChunkGrp;
  }

  var materialOverride = null;
  if (!config.lmonly) {
    for (var by = 0; by < 16; ++by) {
      for (var bx = 0; bx < 16; ++bx) {
        var tile = this._getBlockTile(bx, by);
        var chunkGrp = findChunkGrp(tile);
        chunkGrp.blocks.push({x:bx,y:by});
      }
    }
  } else {
    materialOverride = this._createLmOnlyMaterial();
    var tile = this._getBlockTile(0, 0);
    var chunkGrp = findChunkGrp(tile);
    for (var by = 0; by < 16; ++by) {
      for (var bx = 0; bx < 16; ++bx) {
        chunkGrp.blocks.push({x:bx,y:by});
      }
    }
  }

  for (var i = 0; i < chunkGrps.length; ++i) {
    var chunkGrp = chunkGrps[i];

    var blockCount = chunkGrp.blocks.length;
    var verts = new Float32Array(blockCount * 5*5*3);
    var uv0 = new Float32Array(blockCount * 5*5*2);
    var uv1 = new Float32Array(blockCount * 5*5*2);
    var uv2 = new Float32Array(blockCount * 5*5*2);

    for (var j = 0; j < chunkGrp.blocks.length; ++j) {
      var block = chunkGrp.blocks[j];
      this._buildTerrainBlock(block.x, block.y, j, verts, uv0, uv1, uv2);
    }

    var geometry = new THREE.BufferGeometry();
    geometry.addAttribute('position', new THREE.BufferAttribute(verts, 3));
    geometry.addAttribute('index', WorldChunk.getIndicesBuffer());
    geometry.addAttribute('uv', new THREE.BufferAttribute(uv0, 2));
    geometry.addAttribute('uv2', new THREE.BufferAttribute(uv1, 2));
    geometry.addAttribute('uv3', new THREE.BufferAttribute(uv2, 2));

    // Note: count must be the number of indices and not the number of faces.
    geometry.offsets = [{index: 0, count: blockCount * 4*4*2*3, start: 0}];

    geometry.dynamic = false;
    geometry.computeBoundingSphere();
    geometry.computeBoundingBox();
    geometry.computeFaceNormals();
    geometry.computeVertexNormals();


    var chunkGrpMat = materialOverride;
    if (!materialOverride) {
      chunkGrpMat = this._createMaterial(chunkGrp.texId1, chunkGrp.texId2);
    }

    var chunkMesh = new THREE.Mesh(geometry, chunkGrpMat);
    chunkMesh.name = 'TER_' + this.name + '_' + i;
    chunkMesh.position.copy(
        this.position.clone().add(new THREE.Vector3(-80, -80, 0)));
    chunkMesh.updateMatrix();
    chunkMesh.matrixAutoUpdate = false;
    this.rootObj.add(chunkMesh);
    //self.world.octree.add(chunkMesh);
    this.world.terChunks.push(chunkMesh);
    this.world.colObjects.push(chunkMesh);

    var ah = new THREE.AxisHelper(20);
    ah.position.copy(this.position);
    this.rootObj.add(ah);
  }
};

WorldChunk.prototype._loadTerrain = function(callback) {
  var himPath = this.world.basePath + this.name + '.HIM';
  var tilPath = this.world.basePath + this.name + '.TIL';
  var ddsPath = this.world.basePath + this.name + '/' + this.name + '_PLANELIGHTINGMAP.DDS';
  var himRes = this.name + '_tilemap';
  var tilRes = this.name + '_heightmap';

  this.lightmapTex = RoseTextureManager.load(ddsPath);

  // TODO: Move the registration into the world manager.
  //   This is so if a chunk is unloaded and loaded again, we don't
  //   double register the resource.
  this.world.DM.register(tilRes, Tilemap, tilPath);
  this.world.DM.register(himRes, Heightmap, himPath);

  var self = this;
  this.world.DM.get(himRes, tilRes, function(heightmap, tilemap) {
    self.heightmap = heightmap;
    self.tilemap = tilemap;

    self._buildTerrain();
    callback();
  });
};

function _loadChunkObjectGroup(chunk, namePrefix, objList, modelList, lightmap, callback) {
  var waitAll = new MultiWait();
  for (var i = 0; i < objList.length; ++i) {
    var objData = objList[i];
    var obj = modelList.createForStatic(objData.objectId, lightmap, i, waitAll.one());
    obj.name = namePrefix + '_' + i;
    obj.position.copy(objData.position);
    obj.quaternion.copy(objData.rotation);
    obj.scale.copy(objData.scale);
    obj.updateMatrix();
    obj.matrixAutoUpdate = false;
    chunk.rootObj.add(obj);
    //this.octree.add(obj);
    chunk.world.objects.push(obj);
    chunk.world.colObjects.push(obj);
  }
  waitAll.wait(callback);
};

WorldChunk.prototype._loadObjects = function(callback) {
  var litCnstPath = this.world.basePath + this.name + '/LIGHTMAP/BUILDINGLIGHTMAPDATA.LIT';
  var litDecoPath = this.world.basePath + this.name + '/LIGHTMAP/OBJECTLIGHTMAPDATA.LIT';
  var waitAll = new MultiWait();
  var waitDecoObjs = waitAll.one();
  var waitCnstObjs = waitAll.one();
  var self = this;

  LightmapManager.load(litCnstPath, function(cnstLightmap) {
    LightmapManager.load(litDecoPath, function (decoLightmap) {
      _loadChunkObjectGroup(self,'DECO_' + self.name, self.info.objects, self.world.decoModelMgr, decoLightmap, waitDecoObjs);
      _loadChunkObjectGroup(self,'CNST_' + self.name, self.info.buildings, self.world.cnstModelMgr, cnstLightmap, waitCnstObjs);
    });
  });

  waitAll.wait(callback);
};

WorldChunk.prototype._loadWater = function(callback) {
  for (var i = 0; i < this.info.waterPlanes.length; ++i) {
    var plane = this.info.waterPlanes[i];
    var block = new OceanBlock(plane.start, plane.end);
    this.rootObj.add(block.load());
  }

  callback();
};

WorldChunk.prototype.load = function(callback) {
  var self = this;

  if (this.loadState === 2) {
    if (!this.isVisible) {
      this.world.rootObj.add(this.rootObj);
      this.isVisible = true;
    }
    callback();
    return;
  }

  if (callback) {
    this.loadWaiters.push(callback);
  }

  if (this.loadState === 0) {
    this.world.rootObj.add(this.rootObj);
    this.isVisible = true;
    this.loadState = 1;

    var waitAll = new MultiWait();
    this._loadTerrain(waitAll.one());

    MapInfo.load(this.world.basePath + this.name + '.IFO', function (info) {
      self.info = info;
      self._loadObjects(waitAll.one());
      self._loadWater(waitAll.one());

      waitAll.wait(function () {
        self.loadState = 2;
        for (var i = 0; i < self.loadWaiters.length; ++i) {
          self.loadWaiters[i]();
        }
        self.loadWaiters = [];
      });
    });
  }
};

WorldChunk.prototype.markNotNeeded = function() {
  if (this.isVisible) {
    this.world.rootObj.remove(this.rootObj);
    this.isVisible = false;
  }

  // TODO: Implement unloading
};
