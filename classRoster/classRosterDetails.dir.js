angular.module('RealizeApp')
    .directive('classRosterDetails', [
        '$log',
        'User',
        '$rootScope',
        function($log, User, $rootScope) {
            'use strict';

            return {
                restrict: 'EA',
                replace: true,
                scope: {
                    classReference: '=',
                    affiliations: '=?',
                    thumbnails: '=',
                    showErrors: '='
                },

                templateUrl: 'templates/partials/classRosterDetails.html',

                link: function(scope) {

                    /*============ MODEL ============*/

                    scope.getMessage = $rootScope.getMessage;

                    //expose the form to the current class
                    scope.classReference.detailsForm = scope.detailsForm;

                    /*============ MODEL BASED METHODS ============*/

                    /**
                     * @method chooseThumb
                     * @private
                     * @param {Object} thumb
                     */
                    var chooseThumb = function(thumb) {
                        scope.classReference.classImageUrl = thumb.url;
                        scope.selectedThumb = thumb;
                    };

                    /*============ BEHAVIOR ============*/

                    /**
                     * @method userChooseThumb
                     * @param {Object} thumb
                     */
                    scope.userChooseThumb = function(thumb) {
                        scope.detailsForm.$setDirty();
                        chooseThumb(thumb);
                    };

                    /**
                     * @method chooseInstitution
                     * @param {Integer} value
                     */
                    scope.chooseInstitution = function(value) {
                        scope.detailsForm.$setDirty();
                        scope.classReference.orgIndex = value;
                    };

                    /*============ LISTENERS ============*/

                    /*============ INITIALIZATION ============*/

                    chooseThumb(scope.thumbnails[0]);

                }
            };
        }
    ]);
