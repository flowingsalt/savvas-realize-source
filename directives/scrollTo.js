angular.module('RealizeDirectives')
    .directive('scrollTo', [
        function() {
            'use strict';

            return {
                link: function(scope, el, attrs) {
                    el.click(function() {
                        var y = $('#' + attrs.scrollTo).offset().top;

                        $('html, body').animate({scrollTop: y}, 500);
                    });
                }
            };
        }
    ]);
