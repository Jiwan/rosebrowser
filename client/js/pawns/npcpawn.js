'use strict';

function NpcPawn(go) {
  this.rootObj = new THREE.Object3D();
  this.rootObj.owner = this;

  if (go) {
    this.owner = go;

    this.rootObj.name = 'NPC_' + go.serverObjectIdx + '_' + go.charIdx;
    this.rootObj.rotation.z = go.direction;
    this.setModel(go.charIdx);
  }
}

NpcPawn.prototype._setModel = function(charData, modelMgr, charIdx) {
  var self = this;

  var char = charData.characters[charIdx];
  if (!char) {
    console.warn('Attempted to use npc character which does not exist');
    return false;
  }

  var skelPath = charData.skeletons[char.skeletonIdx];

  SkeletonData.load(skelPath, function(zmdData) {
    var charSkel = zmdData.create(self.rootObj);

    var charModels = char.models;
    for (var i = 0; i < charModels.length; ++i) {
      var model = modelMgr.data.models[charModels[i]];

      for (var j = 0; j < model.parts.length; ++j) {
        (function(part) {
          if (part.position || part.rotation || part.scale || part.axisRotation) {
            console.warn('NPC Character part has invalid transform data.');
          }
          var material = modelMgr._createMaterial(part.materialIdx);

          var meshPath = modelMgr.data.meshes[part.meshIdx];
          Mesh.load(meshPath, function (geometry) {
            var charPartMesh = new THREE.SkinnedMesh(geometry, material);
            charPartMesh.bind(charSkel);
            self.rootObj.add(charPartMesh);
          });
        })(model.parts[j]);
      }
    }

    var animPath = charData.animations[char.animations[0]];
    AnimationData.load(animPath, function(zmoData) {
      var anim = new SkeletonAnimator(charSkel, zmoData);
      anim.play();
    });

    for (var e = 0; e < char.effects.length; ++e) {
      var effectPath = charData.effects[char.effects[e].effectIdx];
      var boneIdx = char.effects[e].boneIdx;
      var effect = EffectManager.loadEffect(effectPath);
      charSkel.dummies[boneIdx].add(effect.rootObj);
      effect.play();
    }
  });
};

NpcPawn.prototype.setModel = function(charIdx, callback) {
  var self = this;
  GDM.get('npc_chars', 'npc_models', function(charList, modelList) {
    self._setModel(charList, modelList, charIdx);
    if (callback) {
      callback();
    }
  });
};

NpcPawn.prototype.update = function(delta) {

};
