// responsive-title: limit character length and wrap to another line if necessary
// @attr character-limit: the total number of characters allowed
// @attr responsive-lower-limit: character limit of first row given maximum number of neighbor elements
// @attr responsive-upper-limit: character limit of first row given minimum number of neighbor elements
// @attr neighbors: jquery selector for elements adjacent to text
//
// Usage:
// <h1 responsive-title="{{ titleModel }}"></h1>
// <h1 responsive-title="{{ titleModel }}" character-limit="75"
//     responsive-lower-limit="45" responsive-upper-limit="60"></h1>
angular.module('RealizeDirectives')
    .directive('responsiveTitle', [
        '$log',
        '$window',
        '$filter',
        function($log, $window, $filter) {
            'use strict';

            return {
                scope: {
                    title: '@responsiveTitle'
                },
                link: function(scope, element, attributes) {
                    var characterLimit = parseInt(attributes.characterLimit, 10) || 75,
                        lowerLimit = parseInt(attributes.responsiveLowerLimit, 10) || 45,
                        upperLimit = parseInt(attributes.responsiveUpperLimit, 10) || 60,
                        // below were commented out since neighbors never used and neighborCount never set
                        //neighbors = attributes.neighbors || '.name + .nav.nav-pills li',
                        //responsiveLimit = neighborCount > 4 ? lowerLimit : upperLimit,
                        responsiveLimit = false ? lowerLimit : upperLimit,
                        splitLimit = Math.floor(responsiveLimit / 2);

                    scope.$watch('title', function() {
                        // just use ellipses if not tablet
                        if (angular.element($window).width() > 979) {
                            element.html($filter('ellipses')(scope.title, characterLimit));
                        } else {
                            // break at word boundary
                            var title = scope.title,
                                splitAt = title.lastIndexOf(' ', splitLimit);
                            element.attr('title', title);
                            title = $filter('ellipses')(title, responsiveLimit);
                            element.prepend(title.substr(0, splitAt));
                            element.append('<div class="title-overflow" />').append(title.substr(splitAt));
                        }
                    });
                }
            };
        }
    ])

    // adapted from https://github.com/josephschmitt/Clamp.js for AngularJS
    .directive('textClamp', [
        '$log',
        '$window',
        function($log, $window) {
            'use strict';

            /**
             * Return the current style for an element. Shim for IE
             * @param {HTMLElement} elem The element to compute.
             * @param {string} prop The style property.
             * @returns {number}
             */
            function computeStyle(elem, prop) {
                if (!$window.getComputedStyle) {
                    $window.getComputedStyle = function(el) {
                        this.el = el;
                        this.getPropertyValue = function(prop) {
                            var re = /(\-([a-z]){1})/g;
                            if (prop === 'float') {
                                prop = 'styleFloat';
                            }
                            if (re.test(prop)) {
                                prop = prop.replace(re, function(douglas, crockford, lint) {
                                    return lint.toUpperCase();
                                });
                            }
                            return el.currentStyle && el.currentStyle[prop] ? el.currentStyle[prop] : null;
                        };
                        return this;
                    };
                }

                return $window.getComputedStyle(elem, null).getPropertyValue(prop);
            }

            /**
             * Returns the line-height of an element as an integer.
             */
            function getLineHeight(elem) {
                var lh = computeStyle(elem, 'line-height');
                if (lh === 'normal') {
                    // Normal line heights vary from browser to browser. The spec recommends
                    // a value between 1.0 and 1.2 of the font size. Using 1.1 to split the diff.
                    lh = parseInt(computeStyle(elem, 'font-size'), 10) * 1.2;
                }
                return parseInt(lh, 10);
            }

            /**
             * Returns the maximum number of lines of text that should be rendered based
             * on the current height of the element and the line-height of the text.
             */
            function getMaxLines(element, height) {
                var availHeight = height || element.clientHeight,
                    lineHeight = getLineHeight(element);

                return Math.max(Math.floor(availHeight / lineHeight), 0);
            }

            /**
             * Returns the maximum height a given element should have based on the line-
             * height of the text and the given clamp value.
             */
            function getMaxHeight(element, clmp) {
                var lineHeight = getLineHeight(element);
                return lineHeight * clmp;
            }

            function getTextNodesIn(node, includeWhitespaceNodes) {
                var textNodes = [], whitespace = /^\s*$/;

                function getTextNodes(node) {
                    if (node.nodeType === 3) {
                        if (includeWhitespaceNodes || !whitespace.test(node.nodeValue)) {
                            textNodes.push(node);
                        }
                    } else {
                        var i, len;
                        for (i = 0, len = node.childNodes.length; i < len; ++i) {
                            getTextNodes(node.childNodes[i]);
                        }
                    }
                }

                getTextNodes(node);
                return textNodes;
            }

            function chop(target) {
                if (target.nodeValue.length && target.nodeValue.length > 0) {
                    target.nodeValue = target.nodeValue.substr(0, target.nodeValue.length - 1);
                    return target.nodeValue;
                } else {
                    return false;
                }
            }

            function getTextHeight(el) {
                var texts = getTextNodesIn(el);

                var united = texts.map(function(node) {
                    return node.nodeValue;
                });
                var temp = $(document.body).append(
                        '<div id="temp_clamp_div" style="postion:absolute;visibility:hidden;width:' +
                        el.clientWidth + 'px;"></div>'
                    );
                $('#temp_clamp_div').text(united.join());
                var tempHeight = $('#temp_clamp_div').height();
                $log.log('temp', tempHeight, temp);
                $('#temp_clamp_div').remove();

                return tempHeight;
            }

            function trunc(el, height) {
                var texts = getTextNodesIn(el);

                var tempHeight = getTextHeight(el);

                if (tempHeight > height) {
                    if (texts.length === 0) {
                        $log.log('out of text nodes');
                        return;
                    }
                    var lastChild = texts[texts.length - 1];
                    if (chop(lastChild)) {
                        $log.log('chopping');
                    } else {
                        if (getTextHeight(el) > height && getTextNodesIn(el).length > 0) {
                            $log.log('keep chopping!');
                            if (lastChild.parentNode !== el) {
                                lastChild.parentNode.removeChild(lastChild);
                            }
                        } else {
                            $log.log('done');
                            return;
                        }
                    }
                    trunc(el, height);
                } else {
                    $log.log('fits');
                }
            }

            return {
                priority: -1, // this directive should go last to ensure all other rendering stuff is done
                link: function(scope, el, attrs) {
                    var clampValue = attrs.textClamp,
                        isCSSValue = clampValue.indexOf &&
                            (clampValue.indexOf('px') > -1 || clampValue.indexOf('em') > -1);

                    function go() {
                        if (clampValue === 'auto') {
                            clampValue = getMaxLines(el[0]);
                        } else if (isCSSValue) {
                            clampValue = getMaxLines(el[0], parseInt(clampValue, 10));
                        }

                        var height = getMaxHeight(el[0], clampValue);
                        $log.log('textClamp height', height, el[0].clientHeight);
                        if (height <= el[0].clientHeight) {
                            trunc(el[0], height);
                        }
                    }

                    scope.$watch(attrs.ngBind, function() {
                        var ogText = el.text();
                        go();
                        attrs.$set('title', ogText);
                    });
                }
            };
        }
    ]);
