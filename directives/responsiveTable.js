/**
 * responsive-table: reports how many columns of a table will fit within the view
 * @attribute responsive-columns: the jquery selector for the overflowing elements
 * @attribute siblings: the jquery selector for other elements that subtract from available width
 * @attribute report-to: parent controller model to send the number to
 * @attribute watch: scope variable that triggers recalculation
 * @example
 *  <table responsive-table responsive-columns=".selector" siblings=".siblings" report-to="modelCount">
 */
angular.module('RealizeDirectives')
    .directive('responsiveTable', [
        '$log',
        '$timeout',
        function($log, $timeout) {
            'use strict';

            return {
                link: function(scope, element, attrs) {
                    var ready = false,
                        originalCount = scope.$eval(attrs.reportTo);

                    function adjustTable() {
                        var width = element.width(),
                            count = 0,
                            model = scope.$parent[attrs.reportTo],
                            elements = element.find(attrs.responsiveColumns),
                            evenlySpaced = true;

                        if (angular.isDefined(attrs.evenlySpaced)) { evenlySpaced =  attrs.evenlySpaced; }

                        if (attrs.siblings) {
                            element.find(attrs.siblings).each(function(i, el) {
                                var elmt = angular.element(el);
                                // RGHT-5337. IE8 may still register non-displaying element as 'visible'
                                if (elmt.is(':visible') && elmt.css('display') !== 'none') {
                                    width -= elmt.outerWidth();
                                }
                            });
                        }

                        // add overflow to elements by using div
                        // note: since scrolling cells only works in webkit
                        elements.each(function() {
                            var elmt = angular.element(this);
                            elmt.html($('<div/>').css('overflow-x', 'auto').append(elmt.html()));
                        });

                        var elts = $.makeArray(elements.children('div'));

                        if (evenlySpaced) {
                            var commonWidth = _.reduce(elts, function(reduction, elt) {
                                var elWidth = angular.element(elt).width();
                                return (reduction < elWidth) ? elWidth : reduction;
                            }, 0);

                            elements.each(function() {
                                angular.element(this).width(commonWidth);
                            });

                            elts = $.makeArray(elements.children('div'));
                        }

                        while (width > 0 && elts.length) {
                            var el = elts.shift(),
                                elWidth = angular.element(el).width();

                            width -= el.scrollWidth;
                            angular.element(el).parent().width(Math.max(el.scrollWidth, elWidth));

                            if (width > 0) { count++; }
                        }

                        if (model > count && count > 0) {
                            scope.$parent[attrs.reportTo] = count;
                        }

                        // get rid of the div we added before
                        elements.each(function() {
                            var elmt = angular.element(this);
                            elmt.html(elmt.children('div').html());
                        });
                    }

                    $timeout(function() {
                        adjustTable();
                        ready = true;
                    });

                    if (attrs.watch) {
                        scope.$watchCollection(attrs.watch, function(val, old) {
                            if (ready && val !== old) {
                                scope.$parent[attrs.reportTo] = originalCount;
                                $timeout(adjustTable);
                            }
                        });
                    }
                }
            };
        }
    ]);
