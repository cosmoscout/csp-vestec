!function(t,e){"object"==typeof exports&&"object"==typeof module?module.exports=e(require("noUiSlider")):"function"==typeof define&&define.amd?define("PersistenceRenderer",["noUiSlider"],e):"object"==typeof exports?exports.PersistenceRenderer=e(require("noUiSlider")):t.PersistenceRenderer=e(t.noUiSlider)}(window,(function(t){return function(t){var e={};function n(i){if(e[i])return e[i].exports;var o=e[i]={i:i,l:!1,exports:{}};return t[i].call(o.exports,o,o.exports,n),o.l=!0,o.exports}return n.m=t,n.c=e,n.d=function(t,e,i){n.o(t,e)||Object.defineProperty(t,e,{enumerable:!0,get:i})},n.r=function(t){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})},n.t=function(t,e){if(1&e&&(t=n(t)),8&e)return t;if(4&e&&"object"==typeof t&&t&&t.__esModule)return t;var i=Object.create(null);if(n.r(i),Object.defineProperty(i,"default",{enumerable:!0,value:t}),2&e&&"string"!=typeof t)for(var o in t)n.d(i,o,function(e){return t[e]}.bind(null,o));return i},n.n=function(t){var e=t&&t.__esModule?function(){return t.default}:function(){return t};return n.d(e,"a",e),e},n.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},n.p="",n(n.s=75)}([function(t,e,n){(function(e){var n=function(t){return t&&t.Math==Math&&t};t.exports=n("object"==typeof globalThis&&globalThis)||n("object"==typeof window&&window)||n("object"==typeof self&&self)||n("object"==typeof e&&e)||Function("return this")()}).call(this,n(40))},function(t,e,n){var i=n(0),o=n(24),r=n(2),s=n(26),a=n(31),c=n(58),u=o("wks"),l=i.Symbol,h=c?l:l&&l.withoutSetter||s;t.exports=function(t){return r(u,t)||(a&&r(l,t)?u[t]=l[t]:u[t]=h("Symbol."+t)),u[t]}},function(t,e){var n={}.hasOwnProperty;t.exports=function(t,e){return n.call(t,e)}},function(t,e){t.exports=function(t){try{return!!t()}catch(t){return!0}}},function(t,e){t.exports=function(t){return"object"==typeof t?null!==t:"function"==typeof t}},function(t,e,n){var i=n(4);t.exports=function(t){if(!i(t))throw TypeError(String(t)+" is not an object");return t}},function(t,e,n){var i=n(3);t.exports=!i((function(){return 7!=Object.defineProperty({},1,{get:function(){return 7}})[1]}))},function(t,e){var n={}.toString;t.exports=function(t){return n.call(t).slice(8,-1)}},function(t,e,n){var i=n(48),o=n(0),r=function(t){return"function"==typeof t?t:void 0};t.exports=function(t,e){return arguments.length<2?r(i[t])||r(o[t]):i[t]&&i[t][e]||o[t]&&o[t][e]}},function(t,e,n){var i=n(6),o=n(10),r=n(18);t.exports=i?function(t,e,n){return o.f(t,e,r(1,n))}:function(t,e,n){return t[e]=n,t}},function(t,e,n){var i=n(6),o=n(20),r=n(5),s=n(19),a=Object.defineProperty;e.f=i?a:function(t,e,n){if(r(t),e=s(e,!0),r(n),o)try{return a(t,e,n)}catch(t){}if("get"in n||"set"in n)throw TypeError("Accessors not supported");return"value"in n&&(t[e]=n.value),t}},function(t,e){t.exports=function(t){if("function"!=typeof t)throw TypeError(String(t)+" is not a function");return t}},function(t,e,n){"use strict";var i,o,r,s,a=n(39),c=n(25),u=n(0),l=n(8),h=n(55),d=n(15),f=n(56),p=n(57),v=n(59),g=n(4),x=n(11),m=n(60),y=n(7),b=n(17),w=n(61),P=n(67),D=n(68),S=n(34).set,T=n(70),E=n(71),I=n(72),_=n(37),C=n(73),B=n(23),M=n(30),j=n(1),N=n(74),k=j("species"),O="Promise",F=B.get,L=B.set,A=B.getterFor(O),U=h,Y=u.TypeError,V=u.document,R=u.process,z=l("fetch"),W=_.f,G=W,H="process"==y(R),q=!!(V&&V.createEvent&&u.dispatchEvent),$=M(O,(function(){if(!(b(U)!==String(U))){if(66===N)return!0;if(!H&&"function"!=typeof PromiseRejectionEvent)return!0}if(c&&!U.prototype.finally)return!0;if(N>=51&&/native code/.test(U))return!1;var t=U.resolve(1),e=function(t){t((function(){}),(function(){}))};return(t.constructor={})[k]=e,!(t.then((function(){}))instanceof e)})),X=$||!P((function(t){U.all(t).catch((function(){}))})),K=function(t){var e;return!(!g(t)||"function"!=typeof(e=t.then))&&e},J=function(t,e,n){if(!e.notified){e.notified=!0;var i=e.reactions;T((function(){for(var o=e.value,r=1==e.state,s=0;i.length>s;){var a,c,u,l=i[s++],h=r?l.ok:l.fail,d=l.resolve,f=l.reject,p=l.domain;try{h?(r||(2===e.rejection&&et(t,e),e.rejection=1),!0===h?a=o:(p&&p.enter(),a=h(o),p&&(p.exit(),u=!0)),a===l.promise?f(Y("Promise-chain cycle")):(c=K(a))?c.call(a,d,f):d(a)):f(o)}catch(t){p&&!u&&p.exit(),f(t)}}e.reactions=[],e.notified=!1,n&&!e.rejection&&Z(t,e)}))}},Q=function(t,e,n){var i,o;q?((i=V.createEvent("Event")).promise=e,i.reason=n,i.initEvent(t,!1,!0),u.dispatchEvent(i)):i={promise:e,reason:n},(o=u["on"+t])?o(i):"unhandledrejection"===t&&I("Unhandled promise rejection",n)},Z=function(t,e){S.call(u,(function(){var n,i=e.value;if(tt(e)&&(n=C((function(){H?R.emit("unhandledRejection",i,t):Q("unhandledrejection",t,i)})),e.rejection=H||tt(e)?2:1,n.error))throw n.value}))},tt=function(t){return 1!==t.rejection&&!t.parent},et=function(t,e){S.call(u,(function(){H?R.emit("rejectionHandled",t):Q("rejectionhandled",t,e.value)}))},nt=function(t,e,n,i){return function(o){t(e,n,o,i)}},it=function(t,e,n,i){e.done||(e.done=!0,i&&(e=i),e.value=n,e.state=2,J(t,e,!0))},ot=function(t,e,n,i){if(!e.done){e.done=!0,i&&(e=i);try{if(t===n)throw Y("Promise can't be resolved itself");var o=K(n);o?T((function(){var i={done:!1};try{o.call(n,nt(ot,t,i,e),nt(it,t,i,e))}catch(n){it(t,i,n,e)}})):(e.value=n,e.state=1,J(t,e,!1))}catch(n){it(t,{done:!1},n,e)}}};$&&(U=function(t){m(this,U,O),x(t),i.call(this);var e=F(this);try{t(nt(ot,this,e),nt(it,this,e))}catch(t){it(this,e,t)}},(i=function(t){L(this,{type:O,done:!1,notified:!1,parent:!1,reactions:[],rejection:!1,state:0,value:void 0})}).prototype=f(U.prototype,{then:function(t,e){var n=A(this),i=W(D(this,U));return i.ok="function"!=typeof t||t,i.fail="function"==typeof e&&e,i.domain=H?R.domain:void 0,n.parent=!0,n.reactions.push(i),0!=n.state&&J(this,n,!1),i.promise},catch:function(t){return this.then(void 0,t)}}),o=function(){var t=new i,e=F(t);this.promise=t,this.resolve=nt(ot,t,e),this.reject=nt(it,t,e)},_.f=W=function(t){return t===U||t===r?new o(t):G(t)},c||"function"!=typeof h||(s=h.prototype.then,d(h.prototype,"then",(function(t,e){var n=this;return new U((function(t,e){s.call(n,t,e)})).then(t,e)}),{unsafe:!0}),"function"==typeof z&&a({global:!0,enumerable:!0,forced:!0},{fetch:function(t){return E(U,z.apply(u,arguments))}}))),a({global:!0,wrap:!0,forced:$},{Promise:U}),p(U,O,!1,!0),v(O),r=l(O),a({target:O,stat:!0,forced:$},{reject:function(t){var e=W(this);return e.reject.call(void 0,t),e.promise}}),a({target:O,stat:!0,forced:c||$},{resolve:function(t){return E(c&&this===r?U:this,t)}}),a({target:O,stat:!0,forced:X},{all:function(t){var e=this,n=W(e),i=n.resolve,o=n.reject,r=C((function(){var n=x(e.resolve),r=[],s=0,a=1;w(t,(function(t){var c=s++,u=!1;r.push(void 0),a++,n.call(e,t).then((function(t){u||(u=!0,r[c]=t,--a||i(r))}),o)})),--a||i(r)}));return r.error&&o(r.value),n.promise},race:function(t){var e=this,n=W(e),i=n.reject,o=C((function(){var o=x(e.resolve);w(t,(function(t){o.call(e,t).then(n.resolve,i)}))}));return o.error&&i(o.value),n.promise}})},function(t,e,n){var i=n(6),o=n(41),r=n(18),s=n(14),a=n(19),c=n(2),u=n(20),l=Object.getOwnPropertyDescriptor;e.f=i?l:function(t,e){if(t=s(t),e=a(e,!0),u)try{return l(t,e)}catch(t){}if(c(t,e))return r(!o.f.call(t,e),t[e])}},function(t,e,n){var i=n(42),o=n(43);t.exports=function(t){return i(o(t))}},function(t,e,n){var i=n(0),o=n(9),r=n(2),s=n(16),a=n(17),c=n(23),u=c.get,l=c.enforce,h=String(String).split("String");(t.exports=function(t,e,n,a){var c=!!a&&!!a.unsafe,u=!!a&&!!a.enumerable,d=!!a&&!!a.noTargetGet;"function"==typeof n&&("string"!=typeof e||r(n,"name")||o(n,"name",e),l(n).source=h.join("string"==typeof e?e:"")),t!==i?(c?!d&&t[e]&&(u=!0):delete t[e],u?t[e]=n:o(t,e,n)):u?t[e]=n:s(e,n)})(Function.prototype,"toString",(function(){return"function"==typeof this&&u(this).source||a(this)}))},function(t,e,n){var i=n(0),o=n(9);t.exports=function(t,e){try{o(i,t,e)}catch(n){i[t]=e}return e}},function(t,e,n){var i=n(22),o=Function.toString;"function"!=typeof i.inspectSource&&(i.inspectSource=function(t){return o.call(t)}),t.exports=i.inspectSource},function(t,e){t.exports=function(t,e){return{enumerable:!(1&t),configurable:!(2&t),writable:!(4&t),value:e}}},function(t,e,n){var i=n(4);t.exports=function(t,e){if(!i(t))return t;var n,o;if(e&&"function"==typeof(n=t.toString)&&!i(o=n.call(t)))return o;if("function"==typeof(n=t.valueOf)&&!i(o=n.call(t)))return o;if(!e&&"function"==typeof(n=t.toString)&&!i(o=n.call(t)))return o;throw TypeError("Can't convert object to primitive value")}},function(t,e,n){var i=n(6),o=n(3),r=n(21);t.exports=!i&&!o((function(){return 7!=Object.defineProperty(r("div"),"a",{get:function(){return 7}}).a}))},function(t,e,n){var i=n(0),o=n(4),r=i.document,s=o(r)&&o(r.createElement);t.exports=function(t){return s?r.createElement(t):{}}},function(t,e,n){var i=n(0),o=n(16),r=i["__core-js_shared__"]||o("__core-js_shared__",{});t.exports=r},function(t,e,n){var i,o,r,s=n(44),a=n(0),c=n(4),u=n(9),l=n(2),h=n(45),d=n(27),f=a.WeakMap;if(s){var p=new f,v=p.get,g=p.has,x=p.set;i=function(t,e){return x.call(p,t,e),e},o=function(t){return v.call(p,t)||{}},r=function(t){return g.call(p,t)}}else{var m=h("state");d[m]=!0,i=function(t,e){return u(t,m,e),e},o=function(t){return l(t,m)?t[m]:{}},r=function(t){return l(t,m)}}t.exports={set:i,get:o,has:r,enforce:function(t){return r(t)?o(t):i(t,{})},getterFor:function(t){return function(e){var n;if(!c(e)||(n=o(e)).type!==t)throw TypeError("Incompatible receiver, "+t+" required");return n}}}},function(t,e,n){var i=n(25),o=n(22);(t.exports=function(t,e){return o[t]||(o[t]=void 0!==e?e:{})})("versions",[]).push({version:"3.6.5",mode:i?"pure":"global",copyright:"© 2020 Denis Pushkarev (zloirock.ru)"})},function(t,e){t.exports=!1},function(t,e){var n=0,i=Math.random();t.exports=function(t){return"Symbol("+String(void 0===t?"":t)+")_"+(++n+i).toString(36)}},function(t,e){t.exports={}},function(t,e,n){var i=n(29),o=Math.min;t.exports=function(t){return t>0?o(i(t),9007199254740991):0}},function(t,e){var n=Math.ceil,i=Math.floor;t.exports=function(t){return isNaN(t=+t)?0:(t>0?i:n)(t)}},function(t,e,n){var i=n(3),o=/#|\.prototype\./,r=function(t,e){var n=a[s(t)];return n==u||n!=c&&("function"==typeof e?i(e):!!e)},s=r.normalize=function(t){return String(t).replace(o,".").toLowerCase()},a=r.data={},c=r.NATIVE="N",u=r.POLYFILL="P";t.exports=r},function(t,e,n){var i=n(3);t.exports=!!Object.getOwnPropertySymbols&&!i((function(){return!String(Symbol())}))},function(t,e){t.exports={}},function(t,e,n){var i=n(11);t.exports=function(t,e,n){if(i(t),void 0===e)return t;switch(n){case 0:return function(){return t.call(e)};case 1:return function(n){return t.call(e,n)};case 2:return function(n,i){return t.call(e,n,i)};case 3:return function(n,i,o){return t.call(e,n,i,o)}}return function(){return t.apply(e,arguments)}}},function(t,e,n){var i,o,r,s=n(0),a=n(3),c=n(7),u=n(33),l=n(69),h=n(21),d=n(35),f=s.location,p=s.setImmediate,v=s.clearImmediate,g=s.process,x=s.MessageChannel,m=s.Dispatch,y=0,b={},w=function(t){if(b.hasOwnProperty(t)){var e=b[t];delete b[t],e()}},P=function(t){return function(){w(t)}},D=function(t){w(t.data)},S=function(t){s.postMessage(t+"",f.protocol+"//"+f.host)};p&&v||(p=function(t){for(var e=[],n=1;arguments.length>n;)e.push(arguments[n++]);return b[++y]=function(){("function"==typeof t?t:Function(t)).apply(void 0,e)},i(y),y},v=function(t){delete b[t]},"process"==c(g)?i=function(t){g.nextTick(P(t))}:m&&m.now?i=function(t){m.now(P(t))}:x&&!d?(r=(o=new x).port2,o.port1.onmessage=D,i=u(r.postMessage,r,1)):!s.addEventListener||"function"!=typeof postMessage||s.importScripts||a(S)||"file:"===f.protocol?i="onreadystatechange"in h("script")?function(t){l.appendChild(h("script")).onreadystatechange=function(){l.removeChild(this),w(t)}}:function(t){setTimeout(P(t),0)}:(i=S,s.addEventListener("message",D,!1))),t.exports={set:p,clear:v}},function(t,e,n){var i=n(36);t.exports=/(iphone|ipod|ipad).*applewebkit/i.test(i)},function(t,e,n){var i=n(8);t.exports=i("navigator","userAgent")||""},function(t,e,n){"use strict";var i=n(11),o=function(t){var e,n;this.promise=new t((function(t,i){if(void 0!==e||void 0!==n)throw TypeError("Bad Promise constructor");e=t,n=i})),this.resolve=i(e),this.reject=i(n)};t.exports.f=function(t){return new o(t)}},function(e,n){e.exports=t},function(t,e,n){var i=n(0),o=n(13).f,r=n(9),s=n(15),a=n(16),c=n(46),u=n(30);t.exports=function(t,e){var n,l,h,d,f,p=t.target,v=t.global,g=t.stat;if(n=v?i:g?i[p]||a(p,{}):(i[p]||{}).prototype)for(l in e){if(d=e[l],h=t.noTargetGet?(f=o(n,l))&&f.value:n[l],!u(v?l:p+(g?".":"#")+l,t.forced)&&void 0!==h){if(typeof d==typeof h)continue;c(d,h)}(t.sham||h&&h.sham)&&r(d,"sham",!0),s(n,l,d,t)}}},function(t,e){var n;n=function(){return this}();try{n=n||new Function("return this")()}catch(t){"object"==typeof window&&(n=window)}t.exports=n},function(t,e,n){"use strict";var i={}.propertyIsEnumerable,o=Object.getOwnPropertyDescriptor,r=o&&!i.call({1:2},1);e.f=r?function(t){var e=o(this,t);return!!e&&e.enumerable}:i},function(t,e,n){var i=n(3),o=n(7),r="".split;t.exports=i((function(){return!Object("z").propertyIsEnumerable(0)}))?function(t){return"String"==o(t)?r.call(t,""):Object(t)}:Object},function(t,e){t.exports=function(t){if(null==t)throw TypeError("Can't call method on "+t);return t}},function(t,e,n){var i=n(0),o=n(17),r=i.WeakMap;t.exports="function"==typeof r&&/native code/.test(o(r))},function(t,e,n){var i=n(24),o=n(26),r=i("keys");t.exports=function(t){return r[t]||(r[t]=o(t))}},function(t,e,n){var i=n(2),o=n(47),r=n(13),s=n(10);t.exports=function(t,e){for(var n=o(e),a=s.f,c=r.f,u=0;u<n.length;u++){var l=n[u];i(t,l)||a(t,l,c(e,l))}}},function(t,e,n){var i=n(8),o=n(49),r=n(54),s=n(5);t.exports=i("Reflect","ownKeys")||function(t){var e=o.f(s(t)),n=r.f;return n?e.concat(n(t)):e}},function(t,e,n){var i=n(0);t.exports=i},function(t,e,n){var i=n(50),o=n(53).concat("length","prototype");e.f=Object.getOwnPropertyNames||function(t){return i(t,o)}},function(t,e,n){var i=n(2),o=n(14),r=n(51).indexOf,s=n(27);t.exports=function(t,e){var n,a=o(t),c=0,u=[];for(n in a)!i(s,n)&&i(a,n)&&u.push(n);for(;e.length>c;)i(a,n=e[c++])&&(~r(u,n)||u.push(n));return u}},function(t,e,n){var i=n(14),o=n(28),r=n(52),s=function(t){return function(e,n,s){var a,c=i(e),u=o(c.length),l=r(s,u);if(t&&n!=n){for(;u>l;)if((a=c[l++])!=a)return!0}else for(;u>l;l++)if((t||l in c)&&c[l]===n)return t||l||0;return!t&&-1}};t.exports={includes:s(!0),indexOf:s(!1)}},function(t,e,n){var i=n(29),o=Math.max,r=Math.min;t.exports=function(t,e){var n=i(t);return n<0?o(n+e,0):r(n,e)}},function(t,e){t.exports=["constructor","hasOwnProperty","isPrototypeOf","propertyIsEnumerable","toLocaleString","toString","valueOf"]},function(t,e){e.f=Object.getOwnPropertySymbols},function(t,e,n){var i=n(0);t.exports=i.Promise},function(t,e,n){var i=n(15);t.exports=function(t,e,n){for(var o in e)i(t,o,e[o],n);return t}},function(t,e,n){var i=n(10).f,o=n(2),r=n(1)("toStringTag");t.exports=function(t,e,n){t&&!o(t=n?t:t.prototype,r)&&i(t,r,{configurable:!0,value:e})}},function(t,e,n){var i=n(31);t.exports=i&&!Symbol.sham&&"symbol"==typeof Symbol.iterator},function(t,e,n){"use strict";var i=n(8),o=n(10),r=n(1),s=n(6),a=r("species");t.exports=function(t){var e=i(t),n=o.f;s&&e&&!e[a]&&n(e,a,{configurable:!0,get:function(){return this}})}},function(t,e){t.exports=function(t,e,n){if(!(t instanceof e))throw TypeError("Incorrect "+(n?n+" ":"")+"invocation");return t}},function(t,e,n){var i=n(5),o=n(62),r=n(28),s=n(33),a=n(63),c=n(66),u=function(t,e){this.stopped=t,this.result=e};(t.exports=function(t,e,n,l,h){var d,f,p,v,g,x,m,y=s(e,n,l?2:1);if(h)d=t;else{if("function"!=typeof(f=a(t)))throw TypeError("Target is not iterable");if(o(f)){for(p=0,v=r(t.length);v>p;p++)if((g=l?y(i(m=t[p])[0],m[1]):y(t[p]))&&g instanceof u)return g;return new u(!1)}d=f.call(t)}for(x=d.next;!(m=x.call(d)).done;)if("object"==typeof(g=c(d,y,m.value,l))&&g&&g instanceof u)return g;return new u(!1)}).stop=function(t){return new u(!0,t)}},function(t,e,n){var i=n(1),o=n(32),r=i("iterator"),s=Array.prototype;t.exports=function(t){return void 0!==t&&(o.Array===t||s[r]===t)}},function(t,e,n){var i=n(64),o=n(32),r=n(1)("iterator");t.exports=function(t){if(null!=t)return t[r]||t["@@iterator"]||o[i(t)]}},function(t,e,n){var i=n(65),o=n(7),r=n(1)("toStringTag"),s="Arguments"==o(function(){return arguments}());t.exports=i?o:function(t){var e,n,i;return void 0===t?"Undefined":null===t?"Null":"string"==typeof(n=function(t,e){try{return t[e]}catch(t){}}(e=Object(t),r))?n:s?o(e):"Object"==(i=o(e))&&"function"==typeof e.callee?"Arguments":i}},function(t,e,n){var i={};i[n(1)("toStringTag")]="z",t.exports="[object z]"===String(i)},function(t,e,n){var i=n(5);t.exports=function(t,e,n,o){try{return o?e(i(n)[0],n[1]):e(n)}catch(e){var r=t.return;throw void 0!==r&&i(r.call(t)),e}}},function(t,e,n){var i=n(1)("iterator"),o=!1;try{var r=0,s={next:function(){return{done:!!r++}},return:function(){o=!0}};s[i]=function(){return this},Array.from(s,(function(){throw 2}))}catch(t){}t.exports=function(t,e){if(!e&&!o)return!1;var n=!1;try{var r={};r[i]=function(){return{next:function(){return{done:n=!0}}}},t(r)}catch(t){}return n}},function(t,e,n){var i=n(5),o=n(11),r=n(1)("species");t.exports=function(t,e){var n,s=i(t).constructor;return void 0===s||null==(n=i(s)[r])?e:o(n)}},function(t,e,n){var i=n(8);t.exports=i("document","documentElement")},function(t,e,n){var i,o,r,s,a,c,u,l,h=n(0),d=n(13).f,f=n(7),p=n(34).set,v=n(35),g=h.MutationObserver||h.WebKitMutationObserver,x=h.process,m=h.Promise,y="process"==f(x),b=d(h,"queueMicrotask"),w=b&&b.value;w||(i=function(){var t,e;for(y&&(t=x.domain)&&t.exit();o;){e=o.fn,o=o.next;try{e()}catch(t){throw o?s():r=void 0,t}}r=void 0,t&&t.enter()},y?s=function(){x.nextTick(i)}:g&&!v?(a=!0,c=document.createTextNode(""),new g(i).observe(c,{characterData:!0}),s=function(){c.data=a=!a}):m&&m.resolve?(u=m.resolve(void 0),l=u.then,s=function(){l.call(u,i)}):s=function(){p.call(h,i)}),t.exports=w||function(t){var e={fn:t,next:void 0};r&&(r.next=e),o||(o=e,s()),r=e}},function(t,e,n){var i=n(5),o=n(4),r=n(37);t.exports=function(t,e){if(i(t),o(e)&&e.constructor===t)return e;var n=r.f(t);return(0,n.resolve)(e),n.promise}},function(t,e,n){var i=n(0);t.exports=function(t,e){var n=i.console;n&&n.error&&(1===arguments.length?n.error(t):n.error(t,e))}},function(t,e){t.exports=function(t){try{return{error:!1,value:t()}}catch(t){return{error:!0,value:t}}}},function(t,e,n){var i,o,r=n(0),s=n(36),a=r.process,c=a&&a.versions,u=c&&c.v8;u?o=(i=u.split("."))[0]+i[1]:s&&(!(i=s.match(/Edge\/(\d+)/))||i[1]>=74)&&(i=s.match(/Chrome\/(\d+)/))&&(o=i[1]),t.exports=o&&+o},function(t,e,n){"use strict";n.r(e),n.d(e,"default",(function(){return S}));n(12);function i(t,e,n){return e in t?Object.defineProperty(t,e,{value:n,enumerable:!0,configurable:!0,writable:!0}):t[e]=n,t}class o{constructor(t,e,n,o){i(this,"persistence",void 0),i(this,"criticalType",void 0),i(this,"coordinates",void 0),i(this,"lower",void 0),i(this,"upper",void 0),this.lower=t,this.upper=e,this.criticalType=n,this.coordinates=o,this.persistence=e.y-t.y}}function r(t,e,n){return e in t?Object.defineProperty(t,e,{value:n,enumerable:!0,configurable:!0,writable:!0}):t[e]=n,t}class s{constructor(t={enableArray:!0,fetchGzip:!1}){if(r(this,"settings",void 0),r(this,"reader",void 0),r(this,"rawPointData",void 0),r(this,"criticalTypeData",void 0),r(this,"coordinateData",void 0),void 0===window.vtk)throw new Error("VTK.js is required.");this.settings=t,this.reader=window.vtk.IO.Core.vtkHttpDataSetReader.newInstance(this.settings)}getReader(){return this.reader}load(t){return new Promise((e,n)=>{this.reader.setUrl(t).then(i=>{i.loadData().then(()=>{const n=i.getOutputData().getPoints().getData(),o=i.getOutputData().getPointData();if(n.length%3!=0)throw new Error("Number of points not dividable by 3.");this.rawPointData=n,this.criticalTypeData=o.getArray(1).getData(),this.coordinateData=o.getArray(2).getData();const r=[];let s=0;for(let t=0;t<n.length;t+=6)r.push(this.createPointTuple(t,s)),s+=2;console.info(`VKT data for file ${t} loaded.`),e({points:r,bounds:i.getOutputData().getBounds(),persistenceBounds:r.reduce((t,e)=>(t.min=0===t.min||e.persistence<t.min?e.persistence:t.min,t.max=0===t.max||e.persistence>t.max?e.persistence:t.max,t),{min:0,max:0})})}).catch(t=>{n(new Error(`Loader Error: ${t}.`))})}).catch(()=>{n(new Error(`Could not access data at ${t}.`))})})}createPointTuple(t,e){if(void 0===this.rawPointData||void 0===this.coordinateData||void 0===this.criticalTypeData)throw new Error("Can't create PersistencePointTuple from undefined data.");const n={x:this.rawPointData[t],y:this.rawPointData[t+1],z:this.rawPointData[t+2]},i={x:this.rawPointData[t+3],y:this.rawPointData[t+4],z:this.rawPointData[t+5]},r={lower:this.criticalTypeData[e],upper:this.criticalTypeData[e+1]},s={lower:{x:this.coordinateData[t],y:this.coordinateData[t+1],z:this.coordinateData[t+2]},upper:{x:this.coordinateData[t+3],y:this.coordinateData[t+4],z:this.coordinateData[t+5]}};return new o(n,i,r,s)}}let a;!function(t){t.DataLoaded="dataloaded",t.SelectionStart="selectionstart",t.SelectionUpdating="selectionupdating",t.SelectionCleared="selectioncleared",t.SelectionEnd="selectionend",t.SliderDestroyed="sliderdestroyed",t.SliderCreated="slidercreated",t.PersistenceBoundsUpdating="persistenceboundsupdating",t.PersistenceBoundsSet="persistenceboundsset",t.PointsDrawn="pointsdrawn",t.PointsCleared="pointscleared"}(a||(a={}));class c{constructor(t){var e,n,i;i=void 0,(n="target")in(e=this)?Object.defineProperty(e,n,{value:i,enumerable:!0,configurable:!0,writable:!0}):e[n]=i,this.target=t}dispatch(t,e){let n;n=void 0!==e?new CustomEvent(t,{detail:e}):new Event(t),this.target.dispatchEvent(n)}}function u(t,e,n){return e in t?Object.defineProperty(t,e,{value:n,enumerable:!0,configurable:!0,writable:!0}):t[e]=n,t}class l{constructor(t){u(this,"id",void 0),u(this,"events",void 0),u(this,"controlData",void 0),u(this,"pointData",void 0),this.id=t.id,this.events=t.events,this.controlData=t,this.pointData=t}}function h(t,e,n){return e in t?Object.defineProperty(t,e,{value:n,enumerable:!0,configurable:!0,writable:!0}):t[e]=n,t}class d extends l{constructor(...t){super(...t),h(this,"element",void 0),h(this,"_context",void 0),h(this,"defaultDrawFunction",(t,e)=>{e.getContext().beginPath(),e.getContext().moveTo(e.xPos(t.lower.x),e.yPos(t.lower.y)),e.getContext().lineTo(e.xPos(t.upper.x),e.yPos(t.upper.y)),e.getContext().stroke()}),h(this,"waitFor",t=>new Promise(e=>setTimeout(e,t)))}update(t){return this.pointData=t,this.draw()}init(){this.createElement()}getContext(){if(void 0===this._context)throw new Error("Canvas context is undefined");return this._context}getElement(){return this.element}getCanvas(){return this.getElement()}xPos(t){return(t-this.pointData.xMinFiltered())/(this.pointData.xMaxFiltered()-this.pointData.xMinFiltered())*(this.rangeXMax-this.rangeXMin)+this.rangeXMin}yPos(t){return(t-this.pointData.yMin())/(this.pointData.yMax()-this.pointData.yMin())*(this.rangeYMax-this.rangeYMin)+this.rangeYMin}createElement(){const t=document.createElement("canvas");t.id="persistence_canvas_"+this.id,t.classList.add("persistence_canvas"),t.width=this.controlData.settings.canvasWidth,t.height=this.controlData.settings.canvasHeight;const e=t.getContext("2d");e.strokeStyle=this.controlData.settings.strokeStyle,this.element=t,this._context=e}draw(){const t=this.pointData.filteredPointsChunked();if(this.getContext().clearRect(0,0,this.controlData.settings.canvasWidth,this.controlData.settings.canvasHeight),0===t.length)return Promise.reject(new Error("Points empty"));this.events.dispatch(a.PointsCleared),this.drawPersistenceLine();const e=[];t.forEach((n,i)=>{console.debug(`Drawing point chunk ${i+1} / ${t.length}`),e.push(this.drawPoints(n,i))});const n=Promise.all(e);return n.then(()=>{this.events.dispatch(a.PointsDrawn)}),n}getPointDrawFunction(){return void 0!==this.controlData.settings.pointDrawFunction?this.controlData.settings.pointDrawFunction:this.defaultDrawFunction}async drawPoints(t,e){await this.waitFor(this.controlData.settings.waitTime*e),t.forEach(t=>this.getPointDrawFunction()(t,this))}drawPersistenceLine(){if(0===this.pointData.points.length)throw new Error("Can't draw persistence line without points.");const t=this.pointData.filteredPoints().sort((t,e)=>t.lower.x-e.lower.x),e=t[0],n=t[t.length-1];this.getContext().beginPath(),this.getContext().moveTo(this.xPos(e.lower.x),this.yPos(e.lower.y)),this.getContext().lineTo(this.xPos(n.lower.x),this.yPos(n.lower.y)),this.getContext().stroke()}get rangeXMin(){return this.controlData.settings.getPadding("left")}get rangeXMax(){return this.controlData.settings.canvasWidth-this.controlData.settings.getPadding("right")}get rangeYMin(){return this.controlData.settings.canvasHeight-this.controlData.settings.getPadding("bottom")}get rangeYMax(){return this.controlData.settings.getPadding("top")}}var f=n(38),p=n.n(f);function v(t,e,n){return e in t?Object.defineProperty(t,e,{value:n,enumerable:!0,configurable:!0,writable:!0}):t[e]=n,t}class g{constructor(t,e,n){v(this,"min",void 0),v(this,"max",void 0),v(this,"width",void 0),this.min=t,this.max=e,this.width=void 0!==n?n:e-t}equals(t){return this.min===t.min&&this.max===t.max&&this.width===t.width}toString(){return`Min: ${this.min} | Max: ${this.max} | Width: ${this.width}`}}function x(t,e,n){return e in t?Object.defineProperty(t,e,{value:n,enumerable:!0,configurable:!0,writable:!0}):t[e]=n,t}class m extends l{constructor(...t){super(...t),x(this,"element",void 0),x(this,"selectedPersistenceBounds",void 0),x(this,"noUiSlider",void 0)}getElement(){return this.element}init(){this.createElement()}update(t){if(void 0!==this.selectedPersistenceBounds&&this.selectedPersistenceBounds.equals(t.activePersistenceBounds))return;this.pointData=t;const{element:e}=this;void 0!==this.noUiSlider&&(this.noUiSlider.destroy(),this.selectedPersistenceBounds=void 0,this.events.dispatch(a.SliderDestroyed)),p.a.create(e,{start:[t.persistenceBounds.min,t.persistenceBounds.max],snap:!1,connect:!0,tooltips:!0,range:t.persistenceBounds}),this.events.dispatch(a.SliderCreated),this.noUiSlider=e.noUiSlider,this.addListener()}createElement(){if(void 0===window.noUiSlider)throw new Error("noUiSlider is required");const t=document.createElement("div");t.id="persistence_slider_"+this.id,t.classList.add("persistence_slider"),this.element=t}addListener(){void 0!==this.noUiSlider?(this.noUiSlider.on("update",t=>{this.selectedPersistenceBounds=new g(t[0],t[1]),this.events.dispatch(a.PersistenceBoundsUpdating,this.selectedPersistenceBounds)}),this.noUiSlider.on("set",t=>{this.selectedPersistenceBounds=new g(t[0],t[1]),this.events.dispatch(a.PersistenceBoundsSet,this.selectedPersistenceBounds),this.pointData.setActivePersistenceBounds(this.selectedPersistenceBounds)})):console.error("Trying to add event listeners to non existing noUiSlider.")}}function y(t,e,n){return e in t?Object.defineProperty(t,e,{value:n,enumerable:!0,configurable:!0,writable:!0}):t[e]=n,t}class b extends l{constructor(...t){super(...t),y(this,"_element",void 0),y(this,"selectionBounds",void 0),y(this,"xStart",0),y(this,"xCurrent",0)}getElement(){return this._element}init(){this.createElement()}update(){}get element(){if(void 0===this._element)throw new Error("Selection Control element is undefined.");return this._element}get canvas(){return this.controlData.renderer.getCanvas()}createElement(){const t=document.createElement("div");t.hidden=!0,t.id="persistence_selection_"+this.id,t.classList.add("persistence_selection"),this.controlData.container.style.position="relative",Object.assign(t.style,{backgroundColor:"rgba(221,221,225,0.8)",border:"1px solid #ddf",width:"0",height:"0",mixBlendMode:"difference",willChange:"top, left, width, height",top:0,left:0,position:"absolute",zIndex:1,boxSizing:"border-box"}),this._element=t,this.addListener()}reCalculateSize(){const t=Math.min(this.xStart,this.xCurrent),e=Math.max(this.xStart,this.xCurrent),n=this.controlData.settings.canvasHeight-this.controlData.settings.getPadding("top")-this.controlData.settings.getPadding("bottom");this.element.style.left=t+"px",this.element.style.top=this.canvas.offsetTop+this.controlData.settings.getPadding("top")+"px",this.element.style.width=e-t+"px",this.element.style.height=n+"px"}addListener(){this.canvas.addEventListener("mousedown",this.mouseDownListener.bind(this)),this.canvas.addEventListener("mousemove",this.mouseMoveListener.bind(this)),this.element.addEventListener("mousemove",this.mouseMoveListener.bind(this)),this.canvas.addEventListener("mouseup",this.mouseUpListener.bind(this)),this.element.addEventListener("mouseup",this.mouseUpListener.bind(this)),this.canvas.addEventListener("contextmenu",this.clearSelection.bind(this)),this.element.addEventListener("contextmenu",this.clearSelection.bind(this))}mouseDownListener(t){this.controlData.settings.selectionStopPropagation&&t.stopPropagation(),this.xStart=t.clientX-this.canvas.getBoundingClientRect().left,this.xStart<this.controlData.settings.getPadding("left")/2||(this.element.hidden=!1,this.events.dispatch(a.SelectionStart),this.reCalculateSize())}mouseMoveListener(t){this.events.dispatch(a.SelectionUpdating),this.xCurrent=t.clientX-this.canvas.getBoundingClientRect().left,this.reCalculateSize()}mouseUpListener(){this.calculateSelectionBounds(),this.element.hidden=!0,void 0!==this.selectionBounds&&this.selectionBounds.width<this.controlData.settings.selectionMinWidth||(this.pointData.setActiveSelectionBounds(this.selectionBounds),this.events.dispatch(a.SelectionEnd,this.selectionBounds))}clearSelection(t){t.preventDefault(),this.pointData.setActiveSelectionBounds(void 0),this.events.dispatch(a.SelectionCleared)}calculateSelectionBounds(){if(this.getElement().hidden)return void(this.selectionBounds=void 0);let t=Math.max(this.controlData.settings.getPadding("left"),this.element.getBoundingClientRect().left-this.canvas.getBoundingClientRect().left);const e=(t,e,n,i,o)=>(t-e)*(o-i)/(n-e)+i,n=this.element.getBoundingClientRect().left-this.canvas.getBoundingClientRect().left+this.element.getBoundingClientRect().width;let i=Math.max(0,Math.min(n,this.controlData.settings.canvasWidth-this.controlData.settings.getPadding("right")));const o=i-t,r=this.pointData.activeSelectionBounds.min!==Number.NEGATIVE_INFINITY?this.pointData.activeSelectionBounds.min:this.pointData.bounds[0],s=this.pointData.activeSelectionBounds.min!==Number.NEGATIVE_INFINITY?this.pointData.activeSelectionBounds.max:this.pointData.bounds[1];t=e(t,this.controlData.settings.getPadding("left"),this.controlData.settings.canvasWidth-this.controlData.settings.getPadding("right"),r,s),i=e(i,this.controlData.settings.getPadding("left"),this.controlData.settings.canvasWidth-this.controlData.settings.getPadding("right"),r,s),this.selectionBounds=new g(t,i,o)}}class w extends l{getElement(){return this.controlData.renderer.getCanvas()}init(){this.context.textAlign="left",this.context.textBaseline="middle"}get context(){return this.renderer.getContext()}get renderer(){return this.controlData.renderer}drawContainingLines(){this.context.strokeStyle=this.controlData.settings.axesColor,this.context.beginPath(),this.context.moveTo(this.controlData.settings.getPadding("left"),this.renderer.yPos(this.pointData.yMax())),this.context.lineTo(this.controlData.settings.getPadding("left"),this.renderer.yPos(0)),this.context.moveTo(this.controlData.settings.getPadding("left"),this.renderer.yPos(0)),this.context.lineTo(this.renderer.xPos(this.pointData.xMaxFiltered()),this.renderer.yPos(0)),this.context.stroke()}update(t){this.context.save(),this.context.fillStyle=this.controlData.settings.axesTextColor,this.pointData=t,this.drawContainingLines(),this.context.strokeStyle=this.controlData.settings.axesTickColor,this.xAxisTicks(),this.yAxisTicks(),this.context.restore()}xAxisTicks(){const t="number"==typeof this.controlData.settings.axesTickCount?this.controlData.settings.axesTickCount:this.controlData.settings.axesTickCount[0],e="number"==typeof this.controlData.settings.axesTickLength?this.controlData.settings.axesTickLength:this.controlData.settings.axesTickLength[0],n=this.pointData.xMinFiltered(),i=(this.pointData.xMaxFiltered()-n)/t;for(let o=0;o<=t;o+=1){let t=i*o+n,r=t.toFixed(this.controlData.settings.axesTickFractions);"function"==typeof this.controlData.settings.axesTickFormatter&&(r=this.controlData.settings.axesTickFormatter(t,Math.max(0,i*o-1+n)));const s=this.context.measureText(r);t=((t,e,n,i,o)=>(t-e)*(o-i)/(n-e)+i)(t,this.pointData.xMinFiltered(),this.pointData.xMaxFiltered(),this.controlData.settings.getPadding("left"),this.controlData.settings.canvasWidth-this.controlData.settings.getPadding("right")),this.context.beginPath(),this.context.moveTo(t,this.controlData.settings.canvasHeight-this.controlData.settings.getPadding("bottom")),this.context.lineTo(t,this.controlData.settings.canvasHeight-this.controlData.settings.getPadding("bottom")+e),this.context.fillText(r,t-s.width/2,this.controlData.settings.canvasHeight-this.controlData.settings.getPadding("bottom")+e+8),this.context.stroke(),this.context.fill()}}yAxisTicks(){const t="number"==typeof this.controlData.settings.axesTickCount?this.controlData.settings.axesTickCount:this.controlData.settings.axesTickCount[1],e="number"==typeof this.controlData.settings.axesTickLength?this.controlData.settings.axesTickLength:this.controlData.settings.axesTickLength[1];for(let n=0;n<=t;n+=1){const i=(this.pointData.yMax()-this.pointData.yMin())/t*n;let o=i.toFixed(this.controlData.settings.axesTickFractions);"function"==typeof this.controlData.settings.axesTickFormatter&&(o=this.controlData.settings.axesTickFormatter(i,0));const r=this.context.measureText(o);this.context.beginPath(),this.context.moveTo(this.controlData.settings.getPadding("left"),this.renderer.yPos(i)),this.context.lineTo(this.controlData.settings.getPadding("left")-e,this.renderer.yPos(i)),this.context.fillText(o,this.controlData.settings.getPadding("left")-e-r.width-2,this.renderer.yPos(i)),this.context.stroke(),this.context.fill()}}}const P={padding:{left:40,top:10,right:10,bottom:20},canvasWidth:500,canvasHeight:500,strokeStyle:"#000",chunks:100,waitTime:5,pointDrawFunction:void 0,enableSelectionFilter:!1,enablePersistenceFilter:!1,enableAxes:!0,axesColor:"#000",axesTickCount:5,axesTickLength:5,axesTickColor:"#000",axesTickFractions:2,axesTextColor:"#000",selectionStopPropagation:!1,selectionMinWidth:10,getPadding(t="left"){const{padding:e}=this;if("number"==typeof e)return e;if(void 0===e[t])throw new Error(t+" does not exist on [left, top, right, bottom].");return e[t]}};function D(t,e,n){return e in t?Object.defineProperty(t,e,{value:n,enumerable:!0,configurable:!0,writable:!0}):t[e]=n,t}class S{constructor(t,e,n={}){if(D(this,"container",void 0),D(this,"id",void 0),D(this,"events",void 0),D(this,"settings",{}),D(this,"_renderer",void 0),D(this,"_points",void 0),D(this,"_pointChunks",void 0),D(this,"_bounds",void 0),D(this,"_persistenceBounds",void 0),D(this,"_activePersistenceBounds",void 0),D(this,"_activeSelectionBounds",void 0),D(this,"controlElements",void 0),D(this,"loader",void 0),"string"==typeof t){const e=document.querySelector(t);if(null===e)throw new Error(`Element with query selector ${t} not found.`);this.container=e}else{if(!(t instanceof HTMLElement))throw new Error("Container is neither a string nor an instance of HTMLElement.");this.container=t}this.id=e,Object.assign(this.settings,P,n),this.loader=new s,this.events=new c(this.container),this.controlElements=new Array,this.createControlElements()}setLoader(t){this.loader=t}async load(t){return this.loader.load(t).then(t=>{this._points=t.points,this._pointChunks=this.chunkPoints(t.points),this._bounds=t.bounds,this._persistenceBounds=t.persistenceBounds,this._activePersistenceBounds=void 0,this._activeSelectionBounds=void 0,this.events.dispatch(a.DataLoaded)})}get renderer(){return this._renderer}update(){void 0!==this._points&&this.controlElements.forEach(t=>{t.update(this)})}get points(){return void 0===this._points?[]:this._points}get pointChunks(){return void 0===this._pointChunks?[]:this._pointChunks}get bounds(){return void 0===this._bounds?[Number.NEGATIVE_INFINITY,Number.POSITIVE_INFINITY,Number.NEGATIVE_INFINITY,Number.POSITIVE_INFINITY,Number.NEGATIVE_INFINITY,Number.POSITIVE_INFINITY]:this._bounds}get persistenceBounds(){return void 0===this._persistenceBounds?new g(Number.NEGATIVE_INFINITY,Number.POSITIVE_INFINITY):this._persistenceBounds}get activePersistenceBounds(){return void 0===this._activePersistenceBounds?new g(Number.NEGATIVE_INFINITY,Number.POSITIVE_INFINITY):this._activePersistenceBounds}setActivePersistenceBounds(t){this._activePersistenceBounds=t,this.update()}get activeSelectionBounds(){return void 0===this._activeSelectionBounds?new g(Number.NEGATIVE_INFINITY,Number.POSITIVE_INFINITY):this._activeSelectionBounds}setActiveSelectionBounds(t){this._activeSelectionBounds=t,this.update()}xMin(){return this.bounds[0]}xMinFiltered(){return this.activeSelectionBounds.min!==Number.NEGATIVE_INFINITY?this.activeSelectionBounds.min:this.xMin()}xMax(){return this.bounds[1]}xMaxFiltered(){return this.activeSelectionBounds.min!==Number.NEGATIVE_INFINITY?this.activeSelectionBounds.max:this.xMax()}yMin(){return this.bounds[2]}yMax(){return this.bounds[3]}filteredPoints(){return void 0===this.points?[]:this.filterPersistence(this.filterSelection(this.points))}filteredPointsChunked(){return this.chunkPoints(this.filteredPoints())}createControlElements(){const t=new d(this);if(t.init(),this.container.appendChild(t.getElement()),this.controlElements.push(t),this._renderer=t,this.settings.enableSelectionFilter){const t=new b(this);t.init(),this.container.appendChild(t.getElement()),this.controlElements.push(t)}if(this.settings.enablePersistenceFilter){const t=new m(this);t.init(),this.container.appendChild(t.getElement()),this.controlElements.push(t)}if(this.settings.enableAxes){const t=new w(this);t.init(),this.controlElements.push(t)}}filterSelection(t){return void 0===this._renderer?t:t.filter(t=>t.lower.x>=this.activeSelectionBounds.min&&t.lower.x<=this.activeSelectionBounds.max)}filterPersistence(t){return t.filter(t=>t.persistence>=Number(this.activePersistenceBounds.min)&&t.persistence<=Number(this.activePersistenceBounds.max))}chunkPoints(t){return t.reduce((t,e,n)=>{const i=Math.floor(n/this.settings.chunks);return t[i]||(t[i]=[]),t[i].push(e),t},[])}}}]).default}));