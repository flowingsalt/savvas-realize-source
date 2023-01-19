angular.module('RealizeApp')
    .directive('classRosterPrograms', [
        '$log',
        'User',
        '$rootScope',
        function($log, User, $rootScope) {
            'use strict';

            return {
                restrict: 'EA',
                replace: true,
                scope: {
                    classReference: '=classReference',
                    affiliations: '=',
                    programLimit: '='
                },

                templateUrl: 'templates/classRoster/classRosterPrograms.dir.html',

                controller: ['$scope', function($scope) {

                    $scope.getMessage = $rootScope.getMessage;

                    /*============ PRIVATE VARIABLES/METHODS ============*/

                    /*============ MODEL ============*/

                    $scope.programList = [];
                    $scope.programLimit = $scope.programLimit || 8;

                    /*============ MODEL BASED VARIABLED AND METHODS ============*/

                    var setSubscribedPrograms = function() {
                        $scope.subscribedPrograms = _.where($scope.programList, {subscribed: true});
                    };

                    var setProgramList = function(index) {
                        $scope.programList = $scope.affiliations[index].products;
                        $scope.classReference.organizationId = $scope.affiliations[index].organizationId;

                        angular.forEach($scope.programList, function(program) {
                            program.checked = $scope.classReference.$hasProductId(program.productId);
                        });

                        setSubscribedPrograms();

                    };

                    /*============ BEHAVIOR ============*/

                    $scope.setProductId = function(val) {

                        $log.log('setProductId', val, $scope.classReference.productIds);

                        if ($scope.classReference.$hasProductId(val)) {
                            // remove it
                            $scope.classReference.productIds = $.Enumerable.From($scope.classReference.productIds)
                                .Where('$ != \'' + val + '\'').ToArray();
                        } else {
                            $scope.classReference.productIds.push(val);
                            $scope.$emit('class-roster-programs.productAdded', $scope.classReference);
                        }

                        $scope.productCount = $scope.classReference.productIds.length;
                        $scope.$emit('class-roster-programs.productIdsChanged', $scope.classReference);
                    };

                    /*============ LISTENERS ============*/

                    // changes in org must update everything
                    $scope.$watch('classReference.orgIndex', function(index) {
                        if (!angular.isDefined(index)) {
                            return;
                        }
                        setProgramList(index);
                    });

                    /*============ INITIALIZTION ============*/

                    setProgramList($scope.classReference.orgIndex);
                }]
            };
        }
    ]);
