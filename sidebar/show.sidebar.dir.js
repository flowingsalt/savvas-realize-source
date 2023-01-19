angular.module('Realize.sidebar.ShowSidebar', [])
    .directive('showSidebar', [
        '$rootScope',
        function($rootScope) {
            'use strict';

            return {
                link: function($scope, element) {
                    element.on('click', function() {
                        $rootScope.$broadcast('sidebar:open');
                        $('html, body').animate({
                            scrollTop: 0
                        }, 0);
                    });
                }
            };
        }
    ]);
