angular.module('RealizeDirectives')
    .directive('programsLanding', [
        '$log',
        'SHARED_THUMBNAIL_PATH',
        '$rootScope',
        '$location',
        'BrowserInfo',
        function($log, SHARED_THUMBNAIL_PATH, $rootScope, $location, BrowserInfo) {
            'use strict';

            return {
                replace: true,
                templateUrl: function(el, attrs) {
                    return attrs.template || 'templates/views/programlist.html';
                },
                controller: ['$scope', function($scope) {
                    if (!$scope.programs.length) {
                        $rootScope.viewLoading = false;
                    }
                    //inherits $scope.favoriteAttr, $scope.sortByAttr, $scope.programs, $scope.open(),
                    //    $scope.totalMatches from parent ctrl
                    $scope.favorites = $rootScope.currentUser.getAttribute($scope.favoriteAttr) || [];

                    $scope.getMessage = $rootScope.getMessage;

                    $scope.thumbnailStyle = function(program) {
                        return {
                            'visibility': program.thumbnailLocation === '' ? 'hidden' : 'visible'
                        };
                    };

                    $scope.programThumb = function(program) {
                        if (program.thumbnailLocation === '') {
                            return '';
                        }

                        var fileExtension = '.png';
                        if (BrowserInfo.isHDDisplay) {
                            fileExtension = '@2x' + fileExtension;
                        }
                        return SHARED_THUMBNAIL_PATH + '/' + program.thumbnailLocation + '_course' + fileExtension;
                    };

                    $scope.sortBy = $rootScope.currentUser.getAttribute($scope.sortByAttr) || '+gradeNumbers[0]';

                    // Sort the program listing
                    $scope.sortPrograms = function(e, sortBy) {
                        if (e) {
                            e.stopPropagation();
                            e.preventDefault();
                        }

                        if ($scope.sortBy.substr(1) === sortBy) {
                            $scope.sortBy = ($scope.sortBy[0] === '-') ? $scope.sortBy = '+' + sortBy :
                                $scope.sortBy = '-' + sortBy;
                        } else {
                            $scope.sortBy = '+' + sortBy;
                        }

                        $rootScope.currentUser.setAttribute($scope.sortByAttr, $scope.sortBy);
                    };

                    $scope.inCentersTab = $location.path().indexOf('centers') >= 0;

                    // Toggle program favorite status
                    $scope.toggleFavorite = function(e, program) {
                        e.stopPropagation();
                        e.preventDefault();

                        var i,
                        numFavs = $scope.favorites.length;

                        // find blank
                        var duplicate = false;

                        for (i = 0; i < numFavs; i++) {
                            // if we already have this ID then we're trying to remove it
                            if (program.id === $scope.favorites[i]) {
                                $scope.favorites.splice(i, 1);
                                program.isFavorite = '';
                                duplicate = true;
                                break;
                            }
                        }

                        if (!duplicate) {
                            $scope.favorites.push(program.id);
                            program.isFavorite = true;
                        }

                        // write the favorites back to server
                        $rootScope.currentUser.setAttribute($scope.favoriteAttr, $scope.favorites);

                        $log.log('Toggle favorite status for program id:', program.id);

                        // If currently sorting by fav but no more favorites, go back to default sort (grade)
                        if ($scope.favorites.length < 1 && $scope.sortBy.indexOf('isFavorite') > 0) {
                            $scope.sortPrograms(null, 'gradeNumbers[0]');
                        }
                    };
                }]
            };
        }
    ]);
