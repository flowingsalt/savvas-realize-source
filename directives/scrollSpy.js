// fires scroll event on an element
// if attribute has value, it will be used for the scope value
// scroll-spy-on tells it what to watch, otherwise it'll record all children
// <div scroll-spy="myScrollSpy" scroll-spy-on="selector">...</div>
angular.module('RealizeApp')
    .directive('scrollSpy', [
        function() {
            'use strict';

            var spyIndex = 0; // track all the spies

            return {
                link: function(scope, el, attrs) {
                    var modelName = attrs.scrollSpy || ('scrollSpy' + spyIndex++);
                    scope[modelName] = [];

                    el.scroll(function() {
                        var result;

                        if (attrs.scrollSpyOn) {
                            result = $(this).find(attrs.scrollSpyOn).map(function() {
                                    return $(this).position();
                                }).get();
                        } else {
                            result = $(this).children().map(function() { return $(this).position(); }).get();
                        }

                        scope.$apply(function() {
                            scope[modelName] = result;
                        });
                        scope.$emit('scrollSpy.' + modelName, result);
                    });
                }
            };
        }
    ]);
