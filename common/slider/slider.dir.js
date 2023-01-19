/*
    Slider & Range Slider UI component based on Filament plugin,
    which is further based on jQuery UI Slider
    To use Range Slider, set range-slider = true else false for single slider
    To hide the labels, set slider-label-count = 0
    To hide the tooltip set slider-show-tooltip = false
*/
angular.module('Realize.slider.sliderDir', [])
    .directive('slider', [
        '$log',
        '$timeout',
        function($log, $timeout) {
            'use strict';

            var BR = 'BR';
            var LEXILE = 'Lexile';

            return {
                replace: true,
                templateUrl: 'templates/common/slider/slider.dir.html',
                scope: {
                    scale:'=slider',
                    showTooltip:'=sliderShowTooltip',
                    labelCount:'=?sliderLabelCount',
                    isRange:'=rangeSlider'
                },
                link: function(scope, el) {
                    var trimBRValuesForLexileSearch = function() {
                        if (scope.scale.title === LEXILE) {
                            scope.selected.start = scope.selected.start === BR ?
                                ' ' + scope.selected.start : scope.selected.start;
                            scope.selected.end = scope.selected.end === BR ?
                                ' ' + scope.selected.end : scope.selected.end;
                        }
                    };
                    scope.selected = scope.scale.selected;
                    scope.range = scope.scale.values;
                    trimBRValuesForLexileSearch();

                    // selectToUiSlider must be called after <option>s are rendered.
                    // For why timeout 0 works,
                    // http://stackoverflow.com/questions/779379/why-is-settimeoutfn-0-sometimes-useful
                    $timeout(function() {
                        var start = el.find('select.start'),
                            end = el.find('select.end');

                        var scaleEl = (scope.isRange) ? start.add(end) : start,
                            newStartVal,
                            newEndVal;

                        scaleEl.selectToUISlider({
                            labels: scope.labelCount || 0,
                            tooltip: scope.showTooltip,
                            sliderOptions: {
                                change:function(e, ui) {
                                    if (scope.isRange) {
                                        newStartVal = scope.range[ui.values[0]];
                                        newEndVal = scope.range[ui.values[1]];
                                        scope.selected.end = newEndVal;
                                    } else {
                                        newStartVal = scope.range[ui.value];
                                    }

                                    scope.selected.start = newStartVal;

                                    scope.$apply();
                                    scope.$emit('slider.change', scope.scale);
                                }
                            }
                        }).hide();

                        var ticLabelsToDisplay = scope.scale.ticLabelsToDisplay,

                            hasTicLabelsList = function() {
                                return angular.isDefined(ticLabelsToDisplay) && !_.isEmpty(ticLabelsToDisplay);
                            },

                            clearExistingTicLabels = function() {
                                el.find('.ui-slider-label-show').removeClass('ui-slider-label-show');
                            };

                        if (hasTicLabelsList()) {
                            clearExistingTicLabels();

                            angular.forEach(ticLabelsToDisplay, function(ticLabelText) {
                                el.find('.ui-slider-label:contains(' + ticLabelText + '):first')
                                .addClass('ui-slider-label-show');
                            });
                        }

                    }, 0, false);

                    scope.resetSlider = function() {
                        scope.selected.start = scope.range[0];
                        if (scope.isRange) {
                            scope.selected.end = scope.range[scope.range.length - 1];
                        }
                    };

                    scope.$on('slider.resetSliderValues', function() {
                        scope.resetSlider();
                    });
                }
            };
        }
    ]);
