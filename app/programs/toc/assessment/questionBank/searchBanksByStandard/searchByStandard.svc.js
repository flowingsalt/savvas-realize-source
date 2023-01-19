angular.module('Realize.assessment.searchByStandardService', [])
    .service('SearchByStandardService', [

        function() {
            'use strict';

            this.selectedStandardList = [];

            this.selectedStandardListIdResult = [];

            this.addStandard = function(standard) {
                if (standard) {
                    this.selectedStandardList.push(standard);
                }
            };

            this.resetSelectedStandardList = function() {
                this.selectedStandardList = [];
            };

            this.getSelectedStandardList = function() {
                return this.selectedStandardList;
            };

            this.removeStandard = function(std) {
                this.selectedStandardList = _.reject(this.selectedStandardList, function(standard) {
                    return standard.id === std.id;
                });
            };
        }
    ]);
