



$.global.getPasteImagePath_FlexGUI = function() {
    try {
        var proj = app.project;
        var targetFolder = null;
        if (proj && proj.file) {
            var parentFolder = proj.file.parent;
            if (parentFolder) {
                targetFolder = new Folder(parentFolder.fsName + "/Akira Pasted");
            }
        }

        
        if (!targetFolder) {
            var desktop = Folder.desktop;
            if (desktop && desktop.exists) {
                targetFolder = new Folder(desktop.fsName + "/Akira Pasted");
            }
        }

        
        if (!targetFolder) {
            var myDocuments = Folder.myDocuments;
            if (myDocuments && myDocuments.exists) {
                targetFolder = new Folder(myDocuments.fsName + "/Akira Pasted");
            }
        }

        
        if (!targetFolder) {
            var temp = Folder.temp;
            if (temp) {
                targetFolder = new Folder(temp.fsName + "/Akira Pasted");
            }
        }

        if (!targetFolder) {
            return "ERR:Could not resolve a target folder for pasted images.";
        }

        if (!targetFolder.exists) {
            var created = targetFolder.create();
            if (!created) {
                targetFolder = Folder.temp;
            }
        }

        var randomNumber = Math.floor(100 + Math.random() * 9000);
        var targetPath = targetFolder.fsName + "/flex_img_" + randomNumber + ".png";
        return targetPath.replace(new RegExp("\\\\", "g"), "/");
    } catch (e) {
        return "ERR:getPasteImagePath failed: " + e.toString();
    }
}

$.global.getDownloadFolder_FlexGUI = function() {
    var proj = app.project;
    var targetFolder;
    if (proj && proj.file) {
        var parentFolder = proj.file.parent;
        targetFolder = new Folder(parentFolder.fsName + "/Akira Downloads");
    } else {
        targetFolder = new Folder(Folder.desktop.fsName + "/Akira Downloads");
    }
    if (!targetFolder.exists) {
        targetFolder.create();
    }
    return targetFolder.fsName.replace(new RegExp("\\\\", "g"), "/");
}

$.global.selectDownloadFolder_FlexGUI = function() {
    var picked = Folder.selectDialog("Choose Download Folder");
    if (picked) {
        return picked.fsName.replace(new RegExp("\\\\", "g"), "/");
    }
    return "";
}

$.global.pasteImageFromFile_FlexGUI = function(filePath, appName, toShapes) {
    if ($._flex && $._flex.isLocked) return "Extension is locked.";
    if (appName === "AEFT") {
        var item;
        var xfile = File(filePath);
        try {
            if (!xfile.exists) return "ERR: Source image does not exist: " + filePath;
            if (!app.project || !app.project.activeItem || !(app.project.activeItem instanceof CompItem)) {
                return "ERR: Open an active composition before importing an image or icon.";
            }
            app.beginUndoGroup("Paste Image");
            item = app.project.importFile(new ImportOptions(xfile));
            if (item && app.project.activeItem && app.project.activeItem instanceof CompItem) {
                var comp = app.project.activeItem;
                var sel = comp.selectedLayers;
                var newLayer = comp.layers.add(item);
                
                
                if (sel.length > 0) {
                    var minIn = 99999, maxOut = -99999, topIndex = 99999;
                    for (var i = 0; i < sel.length; i++) {
                        if (sel[i].inPoint < minIn) minIn = sel[i].inPoint;
                        if (sel[i].outPoint > maxOut) maxOut = sel[i].outPoint;
                        if (sel[i].index < topIndex) topIndex = sel[i].index;
                    }
                    newLayer.inPoint = minIn;
                    newLayer.outPoint = maxOut;
                    newLayer.moveBefore(comp.layers[topIndex]);
                }
                
                
                if (toShapes === true || toShapes === "true" || toShapes === 1 || toShapes === "1") {
                    for (var j = 1; j <= comp.numLayers; j++) {
                        comp.layer(j).selected = false;
                    }
                    newLayer.selected = true;
                    var cmdId = app.findMenuCommandId("Create Shapes from Vector Layer");
                    if (cmdId) {
                        app.executeCommand(cmdId);
                        try {
                            newLayer.remove();
                        } catch (remErr) {}
                    }
                }
            } else {
                app.endUndoGroup();
                return "ERR: After Effects imported no usable footage item.";
            }
            app.endUndoGroup();
            return "SUCCESS";
        } catch (e) {
            app.endUndoGroup();
            return "ERR: " + e.toString();
        }
    }
    return "Not AEFT";
}

$.global.alignLayers_FlexGUI = function(directionModeStr) {
    if ($._flex && $._flex.isLocked) return "Extension is locked.";
    var c = app.project.activeItem;
    if (!c || !(c instanceof CompItem) || c.selectedLayers.length < 1) return;

    
    function getPos(l) {
        try {
            var tForm = l.property("ADBE Transform Group");
            var posProp = tForm.property("ADBE Position");
            if (posProp.dimensionsSeparated) {
                var x = tForm.property("ADBE Position X").value;
                var y = tForm.property("ADBE Position Y").value;
                var z = tForm.property("ADBE Position Z") ? tForm.property("ADBE Position Z").value : 0;
                return [x, y, z];
            } else {
                var val = posProp.value;
                return [val[0], val[1], val.length > 2 ? val[2] : 0];
            }
        } catch (e) {
            return [0, 0, 0];
        }
    }

    
    function setPos(l, val) {
        try {
            var tForm = l.property("ADBE Transform Group");
            var posProp = tForm.property("ADBE Position");
            if (posProp.dimensionsSeparated) {
                tForm.property("ADBE Position X").setValue(val[0]);
                tForm.property("ADBE Position Y").setValue(val[1]);
                if (tForm.property("ADBE Position Z") && val.length > 2) {
                    tForm.property("ADBE Position Z").setValue(val[2]);
                }
            } else {
                posProp.setValue(val);
            }
        } catch (e) { }
    }

    
    function getLayerWorldPos(layer, time) {
        try {
            var tForm = layer.property("ADBE Transform Group");
            if (!tForm) return getPos(layer);
            var anchorProp = tForm.property("ADBE Anchor Point");
            if (!anchorProp) return getPos(layer);
            
            var hasExpr = anchorProp.expressionEnabled;
            var origExpr = anchorProp.expression;
            
            anchorProp.expression = "toComp(anchorPoint)";
            var val = anchorProp.valueAtTime(time, false);
            
            anchorProp.expression = origExpr;
            anchorProp.expressionEnabled = hasExpr;
            
            return [val[0], val[1], val.length > 2 ? val[2] : 0];
        } catch (e) {
            return getPos(layer);
        }
    }

    
    var parts = directionModeStr.split("|");
    var direction = parts[0];
    var alignTo = parts.length > 1 ? parts[1] : "comp";

    app.beginUndoGroup("Align Layers " + direction);
    try {
        var layers = [];
        for (var i = 0; i < c.selectedLayers.length; i++) {
            var l = c.selectedLayers[i];
            if (l.property("ADBE Transform Group") && l.property("ADBE Transform Group").property("ADBE Position")) {
                layers.push(l);
            }
        }
        if (layers.length === 0) { app.endUndoGroup(); return; }
        if ((alignTo === "selection" || alignTo === "key") && layers.length < 2) alignTo = "comp";

        
        var compLeft = 0;
        var compRight = c.width;
        var compTop = 0;
        var compBottom = c.height;
        var compCenterX = c.width / 2;
        var compCenterY = c.height / 2;

        if (alignTo === "selection" || alignTo === "key") {
            var minLeft = 999999;
            var maxRight = -999999;
            var minTop = 999999;
            var maxBottom = -999999;

            var refLayers = layers;
            
            if (alignTo === "key" && layers.length >= 1) {
                refLayers = [layers[layers.length - 1]];
            }

            for (var k = 0; k < refLayers.length; k++) {
                var rl = refLayers[k];
                var rRect = rl.sourceRectAtTime(c.time, false);
                var rTForm = rl.property("ADBE Transform Group");
                var rAnchor = rTForm.property("ADBE Anchor Point").value;
                var rScale = rTForm.property("ADBE Scale").value;
                var rPos = getPos(rl);

                
                var rParentScaleX = 1;
                var rParentScaleY = 1;
                var rp = rl.parent;
                while (rp) {
                    try {
                        var rpTForm = rp.property("ADBE Transform Group");
                        if (rpTForm) {
                            var rpScaleProp = rpTForm.property("ADBE Scale");
                            if (rpScaleProp) {
                                var rpScale = rpScaleProp.value;
                                rParentScaleX *= (rpScale[0] / 100);
                                rParentScaleY *= (rpScale[1] / 100);
                            }
                        }
                    } catch (parentScaleErr) {}
                    rp = rp.parent;
                }

                var rEffScaleX = (rScale[0] / 100) * rParentScaleX;
                var rEffScaleY = (rScale[1] / 100) * rParentScaleY;

                var rWorldX, rWorldY;
                if (rl.parent) {
                    var rWorldPt = getLayerWorldPos(rl, c.time);
                    rWorldX = rWorldPt[0];
                    rWorldY = rWorldPt[1];
                } else {
                    rWorldX = rPos[0];
                    rWorldY = rPos[1];
                }

                var rLeft = rWorldX + (rRect.left - rAnchor[0]) * rEffScaleX;
                var rRight = rLeft + rRect.width * rEffScaleX;
                var rTop = rWorldY + (rRect.top - rAnchor[1]) * rEffScaleY;
                var rBottom = rTop + rRect.height * rEffScaleY;

                if (rLeft < minLeft) minLeft = rLeft;
                if (rRight > maxRight) maxRight = rRight;
                if (rTop < minTop) minTop = rTop;
                if (rBottom > maxBottom) maxBottom = rBottom;
            }

            if (minLeft !== 999999) {
                compLeft = minLeft;
                compRight = maxRight;
                compTop = minTop;
                compBottom = maxBottom;
                compCenterX = (compLeft + compRight) / 2;
                compCenterY = (compTop + compBottom) / 2;
            }
        }

        for (var j = 0; j < layers.length; j++) {
            var l = layers[j];
            
            if (alignTo === "key" && j === layers.length - 1) continue;

            var rect = l.sourceRectAtTime(c.time, false);
            var tForm = l.property("ADBE Transform Group");
            var pos = getPos(l);
            var anchor = tForm.property("ADBE Anchor Point").value;
            var scale = tForm.property("ADBE Scale").value;

            var parentScaleX = 1;
            var parentScaleY = 1;
            var p = l.parent;
            while (p) {
                try {
                    var pTForm = p.property("ADBE Transform Group");
                    if (pTForm) {
                        var pScaleProp = pTForm.property("ADBE Scale");
                        if (pScaleProp) {
                            var pScale = pScaleProp.value;
                            parentScaleX *= (pScale[0] / 100);
                            parentScaleY *= (pScale[1] / 100);
                        }
                    }
                } catch (parentScaleErr) {}
                p = p.parent;
            }

            var effScaleX = (scale[0] / 100) * parentScaleX;
            var effScaleY = (scale[1] / 100) * parentScaleY;

            var worldX, worldY;
            if (l.parent) {
                var worldPt = getLayerWorldPos(l, c.time);
                worldX = worldPt[0];
                worldY = worldPt[1];
            } else {
                worldX = pos[0];
                worldY = pos[1];
            }

            var layerLeft = worldX + (rect.left - anchor[0]) * effScaleX;
            var layerRight = layerLeft + rect.width * effScaleX;
            var layerTop = worldY + (rect.top - anchor[1]) * effScaleY;
            var layerBottom = layerTop + rect.height * effScaleY;
            var layerCenterX = (layerLeft + layerRight) / 2;
            var layerCenterY = (layerTop + layerBottom) / 2;

            var deltaX = 0;
            var deltaY = 0;

            if (direction === "left") {
                deltaX = compLeft - layerLeft;
            } else if (direction === "center") {
                deltaX = compCenterX - layerCenterX;
            } else if (direction === "right") {
                deltaX = compRight - layerRight;
            } else if (direction === "top") {
                deltaY = compTop - layerTop;
            } else if (direction === "middle") {
                deltaY = compCenterY - layerCenterY;
            } else if (direction === "bottom") {
                deltaY = compBottom - layerBottom;
            }

            if (l.parent) {
                var localDeltaX = deltaX / parentScaleX;
                var localDeltaY = deltaY / parentScaleY;
                setPos(l, [
                    pos[0] + localDeltaX,
                    pos[1] + localDeltaY,
                    pos.length > 2 ? pos[2] : 0
                ]);
            } else {
                setPos(l, [
                    pos[0] + deltaX,
                    pos[1] + deltaY,
                    pos.length > 2 ? pos[2] : 0
                ]);
            }
        }
    } catch (e) {
        app.endUndoGroup();
        return "ERR:" + e.toString();
    }
    app.endUndoGroup();
    return "SUCCESS";
}



$.global.alignLayers_FlexGUI_v2_disabled = function (directionModeStr) {
    if ($._flex && $._flex.isLocked) return "ERR:Extension is locked.";

    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return "ERR:Open a composition first.";
    if (!comp.selectedLayers || comp.selectedLayers.length < 1) return "ERR:Select at least one layer.";

    var parts = String(directionModeStr || "").split("|");
    var direction = parts[0] || "";
    var alignTo = parts.length > 1 ? parts[1] : "comp";
    if (direction !== "left" && direction !== "center" && direction !== "right" && direction !== "top" && direction !== "middle" && direction !== "bottom") {
        return "ERR:Unknown alignment direction.";
    }
    if (alignTo !== "comp" && alignTo !== "selection" && alignTo !== "key") alignTo = "comp";

    function valueNow(prop) {
        try { return prop.valueAtTime(comp.time, false); } catch (e) { return prop.value; }
    }

    function setNow(prop, value) {
        if (!prop) return false;
        try {
            if (prop.numKeys && prop.numKeys > 0) prop.setValueAtTime(comp.time, value);
            else prop.setValue(value);
            return true;
        } catch (e) { return false; }
    }

    function getPosition(layer) {
        var transform = layer.property("ADBE Transform Group");
        var position = transform ? transform.property("ADBE Position") : null;
        if (!position) return null;
        if (position.dimensionsSeparated) {
            var xProp = transform.property("ADBE Position X");
            var yProp = transform.property("ADBE Position Y");
            var zProp = transform.property("ADBE Position Z");
            return [valueNow(xProp), valueNow(yProp), zProp ? valueNow(zProp) : 0];
        }
        var value = valueNow(position);
        return [value[0], value[1], value.length > 2 ? value[2] : 0];
    }

    function setPosition(layer, value) {
        var transform = layer.property("ADBE Transform Group");
        var position = transform ? transform.property("ADBE Position") : null;
        if (!position) return false;
        if (position.dimensionsSeparated) {
            var okX = setNow(transform.property("ADBE Position X"), value[0]);
            var okY = setNow(transform.property("ADBE Position Y"), value[1]);
            var zProp = transform.property("ADBE Position Z");
            if (zProp) setNow(zProp, value[2]);
            return okX && okY;
        }
        var original = valueNow(position);
        if (original.length > 2) return setNow(position, [value[0], value[1], value[2]]);
        return setNow(position, [value[0], value[1]]);
    }

    function pointToComp(layer, point) {
        try {
            var result = layer.sourcePointToComp([point[0], point[1]]);
            if (result && result.length >= 2) return [result[0], result[1]];
        } catch (e) { }
        try {
            var transform = layer.property("ADBE Transform Group");
            var anchor = valueNow(transform.property("ADBE Anchor Point"));
            var scale = valueNow(transform.property("ADBE Scale"));
            var position = getPosition(layer);
            if (position) return [position[0] + (point[0] - anchor[0]) * scale[0] / 100, position[1] + (point[1] - anchor[1]) * scale[1] / 100];
        } catch (fallbackError) { }
        return null;
    }

    function getBounds(layer) {
        var transform = layer.property("ADBE Transform Group");
        if (!transform) return null;
        var anchorProp = transform.property("ADBE Anchor Point");
        var anchor = anchorProp ? valueNow(anchorProp) : [0, 0, 0];
        var rect = null;
        try { rect = layer.sourceRectAtTime(comp.time, false); } catch (e) { rect = null; }

        var points = [];
        if (rect && isFinite(rect.left) && isFinite(rect.top) && isFinite(rect.width) && isFinite(rect.height)) {
            points.push([rect.left, rect.top, 0]);
            points.push([rect.left + rect.width, rect.top, 0]);
            points.push([rect.left, rect.top + rect.height, 0]);
            points.push([rect.left + rect.width, rect.top + rect.height, 0]);
        } else {
            points.push([anchor[0], anchor[1], anchor.length > 2 ? anchor[2] : 0]);
        }

        var minX = 999999999;
        var maxX = -999999999;
        var minY = 999999999;
        var maxY = -999999999;
        for (var i = 0; i < points.length; i++) {
            var compPoint = pointToComp(layer, points[i]);
            if (!compPoint) continue;
            if (compPoint[0] < minX) minX = compPoint[0];
            if (compPoint[0] > maxX) maxX = compPoint[0];
            if (compPoint[1] < minY) minY = compPoint[1];
            if (compPoint[1] > maxY) maxY = compPoint[1];
        }

        if (minX === 999999999) {
            var position = getPosition(layer);
            if (!position) return null;
            minX = maxX = position[0];
            minY = maxY = position[1];
        }
        return { left: minX, right: maxX, top: minY, bottom: maxY, centerX: (minX + maxX) / 2, centerY: (minY + maxY) / 2 };
    }

    function unionBounds(layers) {
        var result = null;
        for (var i = 0; i < layers.length; i++) {
            var bounds = getBounds(layers[i]);
            if (!bounds) continue;
            if (!result) result = { left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom };
            else {
                if (bounds.left < result.left) result.left = bounds.left;
                if (bounds.right > result.right) result.right = bounds.right;
                if (bounds.top < result.top) result.top = bounds.top;
                if (bounds.bottom > result.bottom) result.bottom = bounds.bottom;
            }
        }
        if (result) {
            result.centerX = (result.left + result.right) / 2;
            result.centerY = (result.top + result.bottom) / 2;
        }
        return result;
    }

    function compDeltaToPositionDelta(layer, deltaX, deltaY) {
        if (!layer.parent) return [deltaX, deltaY];
        try {
            var transform = layer.property("ADBE Transform Group");
            var anchorProp = transform ? transform.property("ADBE Anchor Point") : null;
            var anchor = anchorProp ? valueNow(anchorProp) : [0, 0, 0];
            var worldAnchor = pointToComp(layer, anchor);
            var localA = layer.parent.compPointToSource([worldAnchor[0], worldAnchor[1]]);
            var localB = layer.parent.compPointToSource([worldAnchor[0] + deltaX, worldAnchor[1] + deltaY]);
            return [localB[0] - localA[0], localB[1] - localA[1]];
        } catch (e) { return [deltaX, deltaY]; }
    }

    var layers = [];
    for (var i = 0; i < comp.selectedLayers.length; i++) {
        var selected = comp.selectedLayers[i];
        if (!selected.locked && getPosition(selected)) layers.push(selected);
    }
    if (layers.length < 1) return "ERR:No movable selected layers.";
    if (alignTo === "key" && layers.length < 2) return "ERR:Select at least two layers for Key Object alignment.";

    var keyLayer = alignTo === "key" ? layers[layers.length - 1] : null;
    var target = null;
    if (alignTo === "comp") {
        target = { left: 0, right: comp.width, top: 0, bottom: comp.height, centerX: comp.width / 2, centerY: comp.height / 2 };
    } else if (alignTo === "key") {
        target = getBounds(keyLayer);
    } else {
        target = unionBounds(layers);
    }
    if (!target) return "ERR:Unable to calculate alignment bounds.";

    var moved = 0;
    app.beginUndoGroup("Akira Align Layers");
    try {
        for (var j = 0; j < layers.length; j++) {
            var layer = layers[j];
            if (layer === keyLayer) continue;
            var bounds = getBounds(layer);
            var position = getPosition(layer);
            if (!bounds || !position) continue;

            var dx = 0;
            var dy = 0;
            if (direction === "left") dx = target.left - bounds.left;
            else if (direction === "center") dx = target.centerX - bounds.centerX;
            else if (direction === "right") dx = target.right - bounds.right;
            else if (direction === "top") dy = target.top - bounds.top;
            else if (direction === "middle") dy = target.centerY - bounds.centerY;
            else if (direction === "bottom") dy = target.bottom - bounds.bottom;

            var localDelta = compDeltaToPositionDelta(layer, dx, dy);
            if (setPosition(layer, [position[0] + localDelta[0], position[1] + localDelta[1], position[2]])) moved++;
        }
    } catch (error) {
        try { app.endUndoGroup(); } catch (endError) { }
        return "ERR:" + error.toString();
    }
    
    
    try { comp.time = comp.time; } catch (refreshError) { }
    app.endUndoGroup();
    return "SUCCESS:" + moved;
};
