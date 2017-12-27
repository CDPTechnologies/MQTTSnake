/**
* Javascript Client for CDP StudioAPI protocol
*
* Copyright (C) 2016 Jüri Toomessoo (nuubik@gmail.com)
*
* This program is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* any later version.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
*
* You should have received a copy of the GNU General Public License
* along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

/**
 * The studio namespace.
 * @exports studio
 * @namespace
 * @expose
 */
var studio = (function() {
  return {};
})();


/**
 * The studio.protocol namespace.
 * @exports studio.protocol
 * @namespace
 */
studio.protocol = (function(ProtoBuf) {
  var obj = {},
		studioBuilder = ProtoBuf.loadProtoFile("./studioapi.proto");
  obj.Hello = studioBuilder.build("Hello");
  obj.ChallengeSolution = studioBuilder.build("ChallengeSolution");
  obj.ChallengeResponse = studioBuilder.build("ChallengeResponse");
  obj.Container = studioBuilder.build("Container");
  obj.ContainerType = studioBuilder.build("Container.Type");
  obj.Error = studioBuilder.build("Error");
  obj.CDPNodeType = studioBuilder.build("CDPNodeType");
  obj.CDPValueType = studioBuilder.build("CDPValueType");
  obj.Info = studioBuilder.build("Info");
  obj.InfoFlags = studioBuilder.build("Info.Flags");
  obj.Node = studioBuilder.build("Node");
  obj.VariantValue = studioBuilder.build("VariantValue");
  obj.ValueRequest = studioBuilder.build("ValueRequest");

  obj.valueToVariant = function (variantValue, type, value) {
    switch (type) {
      case obj.CDPValueType.eDOUBLE:
        variantValue.d_value = value;
        break;
      case obj.CDPValueType.eFLOAT:
        variantValue.f_value = value;
        break;
      case obj.CDPValueType.eUINT64:
        variantValue.ui64_value = value;
        break;
      case obj.CDPValueType.eINT64:
        variantValue.i64_value = value;
        break;
      case obj.CDPValueType.eUINT:
        variantValue.ui_value = value;
        break;
      case obj.CDPValueType.eINT:
        variantValue.i_value = value;
        break;
      case obj.CDPValueType.eUSHORT:
        variantValue.us_value = value;
        break;
      case obj.CDPValueType.eSHORT:
        variantValue.s_value = value;
        break;
      case obj.CDPValueType.eUCHAR:
        variantValue.uc_value = value;
        break;
      case obj.CDPValueType.eCHAR:
        variantValue.c_value = value;
        break;
      case obj.CDPValueType.eBOOL:
        variantValue.b_value = value;
        break;
      case obj.CDPValueType.eSTRING:
        variantValue.str_value = value;
        break;
    }
  };

  obj.valueFromVariant = function(variantValue, type) {
  switch(type) {
    case obj.CDPValueType.eDOUBLE:
      return variantValue.d_value;
    case obj.CDPValueType.eFLOAT:
      return variantValue.f_value;
    case obj.CDPValueType.eUINT64:
      return variantValue.ui64_value;
    case obj.CDPValueType.eINT64:
      return variantValue.i64_value;
    case obj.CDPValueType.eUINT:
      return variantValue.ui_value;
    case obj.CDPValueType.eINT:
      return variantValue.i_value;
    case obj.CDPValueType.eUSHORT:
      return variantValue.us_value;
    case obj.CDPValueType.eSHORT:
      return variantValue.s_value;
    case obj.CDPValueType.eUCHAR:
      return variantValue.uc_value;
    case obj.CDPValueType.eCHAR:
      return variantValue.c_value;
    case obj.CDPValueType.eBOOL:
      return variantValue.b_value;
    case obj.CDPValueType.eSTRING:
      return variantValue.str_value;
    default:
      return 0;
  }
  };

  function ErrorHandler(){
    this.name = "Error";
    this.handle = function(message){
      return this;
    }.bind(this);
  }

  function ContainerHandler(onContainer, onError){
    this.name = "Container";
    this.handle = function(message){
      try {
        var container = obj.Container.decode(message);
      } catch (err) {
        console.log("Container Error: "+err+"\n");
        onError();
        return new ErrorHandler();
      }
      onContainer(container);
      return this;
    }.bind(this);
  }

  function HelloHandler(socket, onAuth, onContainer, onError){
    this.name = "Hello";
    this.handle = function(message){
      try {
        var hello = obj.Hello.decode(message);
      } catch (err) {
        console.log("Hello Error: "+err+"\n");
        onError();
        return new ErrorHandler();
      }

      if (hello.challenge){
        console.log("Auth not supported for msg: ", hello);
        onError();
        return new ErrorHandler();
      } else {
        var container = new obj.Container();
        container.message_type = obj.ContainerType.eStructureRequest;
        socket.send(container.toArrayBuffer());
        return new ContainerHandler(onContainer, onError);
      }
    };
  }

  obj.Handler = function(socket) {
    this.onContainer = undefined;
    this.onAuth = undefined;
    this.onError = undefined;
    var onContainer = function(container) {(this.onContainer && this.onContainer(container));}.bind(this);
    var onAuth = function(keys,challenge) {(this.onAuth && this.onAuth(keys,challenge));}.bind(this);
    var onError = function(){(this.onError && this.onError());}.bind(this);

    var handler = new HelloHandler(socket, onAuth, onContainer, onError);
    this.handle = function(message){
      handler = handler.handle(message);
    };
  };

  return obj;
})(dcodeIO.ProtoBuf);

studio.protocol.SYSTEM_NODE_ID = 0;
studio.protocol.WS_PREFIX = "ws://";
studio.protocol.BINARY_TYPE = "arraybuffer";


/**
 * The studio.internal namespace.
 * @exports studio.internal
 * @namespace
 */
studio.internal = (function(proto) {
  var obj = {};

  obj.structure  = {
    REMOVE: 0,
    ADD: 1
  }

  function AppNode(appConnection, nodeId) {
    var parent = undefined;
    var id = nodeId;
    var app = appConnection;
    var childRequests = new Map();
    var structureFetched = false;
    var childMap = new Map();
    var givenPromises = new Map();
    var childIterators = new Array();
    var valueSubscriptions = new Array();
    var structureSubscriptions = new Array();
    var lastValue;
    var lastInfo = null; //when we get this, if there are any child requests we need to fetch child fetch too

    this.path = function() {
      var path = "";
      if (parent && parent.id())
        path = parent.path();

      if (path.length)
        path = path + "." + lastInfo.name;
      else
        path = lastInfo.name;

      return path;
    };

    this.id = function() {
      return id;
    };

    this.name = function() {
      return lastInfo.name;
    };

    this.isStructureFetched = function() {
      return structureFetched;
    };

    this.hasSubscriptions = function() {
      return valueSubscriptions.length > 0;
    };

    this.info = function() {
      return lastInfo;
    };

    this.lastValue = function() {
      return lastValue;
    };

    this.forEachChild = function(iteratorFunction) {
      if (structureFetched) {
        childMap.forEach(iteratorFunction);
      } else {
        childIterators.push(iteratorFunction);
        app.makeStructureRequest(id);
      }
    };

    this.update = function(nodeParent, protoInfo) {
      parent = nodeParent;
      lastInfo = protoInfo;
      id = protoInfo.node_id;
      if (valueSubscriptions.length > 0)
        app.makeGetterRequest(id, 5, false);
    };

    this.add = function(node) {
      childMap.set(node.name(), node);
      for (var i = 0; i < structureSubscriptions.length; i++) {
        structureSubscriptions[i](node.name(), obj.structure.ADD);
      }
    };

    this.remove = function(node) {
      for (var i = 0; i < structureSubscriptions.length; i++) {
        structureSubscriptions[i](node.name(), obj.structure.REMOVE);
      }
      childMap.delete(node.name());
    };

    this.child = function(name) {
      return childMap.get(name);
    };

    this.done = function() {
      structureFetched = true;
      //Call process node requests from childRequests
      givenPromises.forEach(function (apiNode, resolve) {
        resolve(apiNode);
      });
      givenPromises.clear();

      for (var i = 0; i < childIterators.length; i++) {
        childMap.forEach(childIterators[i]);
        childIterators.splice(i, 1);
      }
    };

    this.receiveValue = function (nodeValue, nodeTimestamp) {
      lastValue = nodeValue;
      for (var i = 0; i < valueSubscriptions.length; i++) {
        valueSubscriptions[i](nodeValue, nodeTimestamp);
      }
    };

    this.async = {};

    this.async.onDone = function(resolve, apiNode) {
      if (!structureFetched) {
        givenPromises.set(resolve, apiNode);
      } else {
        resolve(apiNode);
      }
    };

    this.async.subscribeToStructure = function(structureConsumer) {
      structureSubscriptions.push(structureConsumer);
    };

    this.async.unsubscribeFromStructure = function(structureConsumer) {
      for (var i = 0; i < structureSubscriptions.length; i++) {
        if (structureConsumer == structureSubscriptions[i]) {
          structureSubscriptions.splice(i, 1);
          break;
        }
      }
    };

    this.async.fetch = function() {
      structureFetched = false;
      app.makeStructureRequest(id);
    };

    this.async.subscribeToValues = function(valueConsumer) {
      if (valueSubscriptions.length == 0) {
        app.makeGetterRequest(id, 5, false);
      }
      valueSubscriptions.push(valueConsumer);
    };

    this.async.unsubscribeFromValues = function(valueConsumer) {
      for (var i = 0; i < valueSubscriptions.length; i++) {
        if (valueConsumer == valueSubscriptions[i]) {
          valueSubscriptions.splice(i, 1);
          break;
        }
      }

      if (valueSubscriptions.length == 0) {
        app.makeGetterRequest(id, 0, true);
      }
    };

    this.async.sendValue = function(value, timestamp) {
      lastValue = value;
      app.makeSetterRequest(id, lastInfo.value_type, value, timestamp);
      //when offline must queue or update pending set request and call set callbacks ...???
    };
  }

  obj.AppConnection = function(url) {
    var appConnection = this;
    var appName = "";
    var appId = undefined;
    var appUrl = proto.WS_PREFIX + url;
    var socket = new WebSocket(appUrl);
    var handler = new proto.Handler(socket);
    var requests = [];
    var nodeMap = new Map();
    var systemNode = new AppNode(appConnection, proto.SYSTEM_NODE_ID);
    var onClosed;
    var onMessage;
    var onError;
    var onOpen;

    socket.binaryType = proto.BINARY_TYPE;
    nodeMap.set(systemNode.id(), systemNode);
    handler.onContainer = handleIncomingContainer;

    var resubscribe = function(item) {
        if (item.isStructureFetched()) {
          console.log("node:   " + item.path());
          item.async.fetch();
          item.async.onDone(function(node){
            console.log("done:   " + node.path());
            node.forEachChild(function(child){
              resubscribe(child);
            })
          },item);
        }
    };

    this.root = function() {
      return nodeMap.get(proto.SYSTEM_NODE_ID);
    };

    onMessage = function(evt) { handler.handle(evt.data); };
    onError = function (ev) { console.log("Socket error: " + ev.data); };
    onOpen = function() { resubscribe(systemNode); };
    onClosed = function (event) {
      var reason;

      if (event.code == 1000)
        reason = "Normal closure, meaning that the purpose for which the connection was established has been fulfilled.";
      else if (event.code == 1001)
        reason = "An endpoint is \"going away\", such as a server going down or a browser having navigated away from a page.";
      else if (event.code == 1002)
        reason = "An endpoint is terminating the connection due to a protocol error";
      else if (event.code == 1003)
        reason = "An endpoint is terminating the connection because it has received a type of data it cannot accept (e.g., an endpoint that understands only text data MAY send this if it receives a binary message).";
      else if (event.code == 1004)
        reason = "Reserved. The specific meaning might be defined in the future.";
      else if (event.code == 1005)
        reason = "No status code was actually present.";
      else if (event.code == 1006)
        reason = "The connection was closed abnormally, e.g., without sending or receiving a Close control frame";
      else if (event.code == 1007)
        reason = "An endpoint is terminating the connection because it has received data within a message that was not consistent with the type of the message (e.g., non-UTF-8 [http://tools.ietf.org/html/rfc3629] data within a text message).";
      else if (event.code == 1008)
        reason = "An endpoint is terminating the connection because it has received a message that \"violates its policy\". This reason is given either if there is no other suitable reason, or if there is a need to hide specific details about the policy.";
      else if (event.code == 1009)
        reason = "An endpoint is terminating the connection because it has received a message that is too big for it to process.";
      else if (event.code == 1010) // Note that this status code is not used by the server, because it can fail the WebSocket handshake instead.
        reason = "An endpoint (client) is terminating the connection because it has expected the server to negotiate one or more extension, but the server didn't return them in the response message of the WebSocket handshake. Specifically, the extensions that are needed are: " + event.reason;
      else if (event.code == 1011)
        reason = "A server is terminating the connection because it encountered an unexpected condition that prevented it from fulfilling the request.";
      else if (event.code == 1015)
        reason = "The connection was closed due to a failure to perform a TLS handshake (e.g., the server certificate can't be verified).";
      else
        reason = "Unknown reason";

      console.log("Socket close: " + reason);

      setTimeout(function () {
        console.log("REconnect timer");
        socket = new WebSocket(appUrl);
        handler = new proto.Handler(socket);
        handler.onContainer = handleIncomingContainer;
        socket.binaryType = proto.BINARY_TYPE;
        socket.onopen = onOpen;
        socket.onclose = onClosed;
        socket.onmessage = onMessage;
        socket.onerror = onError;
      }, 3000);
    };

    socket.onopen = onOpen;
    socket.onclose = onClosed;
    socket.onmessage = onMessage;
    socket.onerror = onError;

    function send(message) {
      if (socket.readyState == WebSocket.OPEN) {
        socket.send(message.toArrayBuffer());
      } else {
        requests.push(message.toArrayBuffer());
      }
    }

    function flushRequests() {
      for (var i = 0; i < requests.length; i++) {
        socket.send(requests[i]);
      }
      requests = [];
    }

    this.makeStructureRequest = function(id) {
      var msg = new proto.Container();
      msg.message_type = proto.ContainerType.eStructureRequest;
      if (id != proto.SYSTEM_NODE_ID) {
        msg.structure_request = new Array();
        msg.structure_request.push(id);
      }
      send(msg);
    };

    this.makeGetterRequest = function(id, fs, stop) {
      var msg = new proto.Container();
      var request = new proto.ValueRequest();
      request.node_id = id;
      request.fs = fs;
      if (stop) {
        request.stop = stop;
      }
      msg.message_type = proto.ContainerType.eGetterRequest;
      msg.getter_request = [request];
      send(msg);
    };

    this.makeSetterRequest = function(id, type, value, timestamp) {
      var msg = new proto.Container();
      var request = new proto.VariantValue();
      request.node_id = id;
      if (timestamp) {
        request.timestamp = timestamp;
      }
      proto.valueToVariant(request, type, value);
      msg.message_type = proto.ContainerType.eSetterRequest;
      msg.setter_request = [request];
      send(msg);
    };

    function addChildNode(parentNode, protoNode) {
      var newNode = new AppNode(appConnection, protoNode.info.node_id);
      newNode.update(parentNode, protoNode.info);
      nodeMap.set(protoNode.info.node_id, newNode);
      parentNode.add(newNode);
    }

    function parseChildNode(parentNode, protoNode) {
      var node = parentNode.child(protoNode.info.name);
      if (node) {
        if (node.id() != protoNode.info.node_id) {
          //node id has changed after reconnect
          nodeMap.delete(node.id());
          nodeMap.set(protoNode.info.node_id, node);
        }
        node.update(parentNode, protoNode.info);
      } else {
        addChildNode(parentNode, protoNode);
      }
    }

    function removeMissingChildNodesByNames(parentNode, names) {
      parentNode.forEachChild(function (childNode, name) {
        if (names.indexOf(name) === -1) {
          parentNode.remove(childNode);
          nodeMap.delete(childNode.id());
        }
      });
    }

    function parseNodes(parentNode, protoNode) {
      var names = [];
      for (var n = 0; n < protoNode.node.length; n++) {
        names.push(protoNode.node[n].info.name);
        parseChildNode(parentNode, protoNode.node[n]);
      }
      removeMissingChildNodesByNames(parentNode, names);
    }

    function parseSystemNode(node, protoNode){
      node.update(systemNode,protoNode.info)
      parseNodes(node, protoNode);
      systemNode.forEachChild(function(childNode) {
        if (childNode.info().is_local) {
          appName = childNode.name();
          appId = childNode.id();
        }
      });
    }

    function parseStructureResponse(protoResponse) {
      for (var i = 0; i < protoResponse.length; i++) {
        var protoNode = protoResponse[i];
        var node = nodeMap.get(protoNode.info.node_id);
        if (protoNode.info.node_id != proto.SYSTEM_NODE_ID) {
          parseNodes(node, protoNode);
        } else {
          parseSystemNode(node, protoNode);
        }
        node.done();
      }
    }

    function parseGetterResponse(protoResponse) {
      for (var i = 0; i < protoResponse.length; i++) {
        var variantValue = protoResponse[i];
        var node = nodeMap.get(variantValue.node_id);
        if (node)
          node.receiveValue(proto.valueFromVariant(variantValue, node.info().value_type), variantValue.timestamp);
      }
    }

    function parseStructureChangeResponse(protoResponse) {
      for (var i = 0; i < protoResponse.length; i++) {
        var invalidatedId = protoResponse[i];
        var node = nodeMap.get(invalidatedId);
        if (node)
          node.fetch();
      }
    }

    function handleIncomingContainer(protoContainer) {
      switch(protoContainer.message_type){
        case proto.ContainerType.eStructureResponse:
          parseStructureResponse(protoContainer.structure_response);
          break;
        case proto.ContainerType.eGetterResponse:
          parseGetterResponse(protoContainer.getter_response);
          break;
        case proto.ContainerType.eStructureChangeResponse:
          parseStructureChangeResponse(protoContainer.structure_change_response);
          break;
        case proto.ContainerType.eCurrentTimeResponse:
          break;
        case proto.ContainerType.eRemoteError:
        default:
          //TODO: Indicate error to Client
      }
      flushRequests();
    };
  };

  return obj;
})(studio.protocol);


/**
 * The studio.api namespace.
 * @exports studio.api
 * @namespace
 * @expose
 */
studio.api = (function(internal) {
  var obj = {};

  /**
   * Creates an instance of INode
   *
   * @param {AppNode} appNode
   * @this INode
   * @constructor
   */
  function INode(appNode) {
    var node = appNode;
    var instance = this;

    /**
     * Get nodes name.
     *
     * @returns {string} A node name.
     */
    this.name = function() {
      return node.name();
    };

    this.info = function() {
      return node.info();
    };
    /**
     * Access the last known value.
     *
     * @returns {number} A value last sent or received on the node.
     */
    this.lastValue = function() {
      return node.lastValue();
    };

    /**
     * Iteration callback used by forEachChild.
     *
     * @callback iteratorCallback
     * @param {INode} childNode
     */

    /**
     * Iterate over children of current node.
     *
     * Iteration starts when structure for the node is received.
     * @param {iteratorCallback} iteratorCallback
     */
    this.forEachChild = function(iteratorCallback) {
      appNode.forEachChild(function(internalNode) {
        iteratorCallback(new INode(internalNode));
      });
    };

    /**
     * Request named child node of this node.
     *
     * @param name
     * @returns {Promise.<INode>} A promise containing named child node when fulfilled.
     */
    this.child = function(name) {
      return new Promise(function(resolve) {
        var childNode = node.child(name);
        if (childNode) {
          childNode.async.fetch();
          childNode.async.onDone(resolve, new INode(childNode));
        } else {
          node.async.fetch();
          node.async.onDone(function() {
            var childNode = node.child(name);
            if (childNode) {
              childNode.async.fetch();
              childNode.async.onDone(resolve, new INode(childNode));
            }
          }, new INode(node));
        }
      });
    };

    /**
     * Value callback used by subscribe.
     *
     * @callback valueConsumer
     * @param {number} value
     * @param {number} timestamp
     */

    /**
     * Subscribe to value changes on this node.
     *
     * @param {valueConsumer} valueConsumer
     */
    this.subscribeToValues = function(valueConsumer) {
      node.async.subscribeToValues(valueConsumer);
    };

    /**
     * Subscribe to node child value changes on this node.
     *
     * @param {string} name
     * @param {valueConsumer} valueConsumer
     */
    this.subscribeToChildValues = function(name, valueConsumer) {
      instance.child(name).then(function (child) {
        child.subscribeToValues(valueConsumer);
      });
    };

    /**
     * Unsubscribe given callback from value changes on this node.
     *
     * @param {valueConsumer}
     */
    this.unsubscribeFromValues = function(valueConsumer) {
      node.async.unsubscribeFromValues(valueConsumer);
    };

    /**
     * Unsubscribe given callback from child value changes on this node.
     *
     * @param {string} name
     * @param {valueConsumer}
     */
    this.unsubscribeFromChildValues = function(name, valueConsumer) {
      instance.child(name).then(function (child) {
        child.unsubscribeFromValues(valueConsumer);
      });
    };

    /**
     * Structure callback used by structure subscribe/unsubscribe.
     *
     * @callback structureConsumer
     * @param {string} node name
     * @param {number} REMOVE 0/ADD 1
     */

    /**
     * Subscribe to structure changes on this node.
     *
     * @param {structureConsumer} structureConsumer
     */
    this.subscribeToStructure = function(structureConsumer) {
      node.async.subscribeToStructure(structureConsumer);
    };

    /**
     * Unsubscribe given callback from structure changes on this node.
     *
     * @param {structureConsumer} structureConsumer
     */
    this.unsubscribeFromStructure = function(structureConsumer) {
      node.async.unsubscribeFromStructure(structureConsumer);
    };

    /**
     * Set nodes value
     *
     * @param value
     * @param timestamp (NOTE: setting with timestamp not yet supported)
     */
    this.setValue = function(value, timestamp) {
      node.async.sendValue(value, timestamp);
    };
  }

  obj.Client = function(studioURL) {
    var appConnection = new internal.AppConnection(studioURL);

    /**
     * Request root node.
     *
     * @returns {Promise.<INode>} A promise containing root node when fulfilled.
     */
    this.root = function(){
      return new Promise(function(resolve) {
        var node = appConnection.root();
        node.async.onDone(resolve, new INode(node));
      });
    };

    /**
     * Request next node on path.
     *
     * @param promise Total from reduce() function
     * @param nodeName The currentValue from reduce() function
     * @param index The index of the nodeName in the array of nodes
     * @param arr The array containing all the node names in the route path
     * 
     * @returns {Promise.<INode>} A promise containing the node for the current location on the path
     */
    
    this.findNode = (function() {
      var memoize = {};

      function f(promise, nodeName, index, arr) {
        var path = arr.slice(0,index+1);
        return memoize[path] || (memoize[path] = promise.then(
                                    function(node) {
                                      return node.child(nodeName);
                                    }
                                  )
                                );
      }
      return f;
    })();
    
    /**
     * Request node with provided path.
     *
     * @param nodePath Should contain dot separated path to target node. Note: root node is not considered part of the path.
     * @returns {Promise.<INode>} A promise containing requested node when fulfilled.
     */
    this.find = function(nodePath) {
      var nodes = nodePath.split(".");
      return nodes.reduce(this.findNode, this.root());
    };

  };

  return obj;
})(studio.internal);
