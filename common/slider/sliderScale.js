angular.module('Realize.slider.scale', [])
    .factory('Scale', [function() {
        'use strict';

        function Scale() {
            this.values = [];
            this.selected = {
                start: '',
                end: ''
            };
        }

        Scale.prototype.$setScaleValues = function(values) {
            var self = this;
            this.values = values;
            this.selected = {
                start: values[0],
                end: values[values.length - 1]
            };

            return self;
        };

        Scale.prototype.$setSelectedValues = function(start, end) {
            var self = this;

            self.selected = {
                start: start,
                end: end
            };

            return self;
        };

        Scale.prototype.$setTicLabelsToDisplay = function(indexList) {
            var self = this, ticLabelsToDisplay = [];

            angular.forEach(indexList, function(index) {
                if (angular.isDefined(self.values[index])) {
                    ticLabelsToDisplay.push(self.values[index]);
                }
            });

            self.ticLabelsToDisplay = ticLabelsToDisplay;

            return self;
        };

        Scale.prototype.allSelectedValuesEqual = function() {
            return this.selected.start === this.selected.end;
        };

        return Scale;
    }]);
