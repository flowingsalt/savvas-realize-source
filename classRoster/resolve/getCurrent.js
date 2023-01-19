angular.module('Realize.classRoster.resolves.getCurrent', [
    'RealizeDataServices'
])
    .factory('ClassRosterResolveGetCurrent', [
        'ClassRoster',
        '$route',
        '$rootScope',
        '$q',
        function(ClassRosterSvc, $route, $rootScope, $q) {
            'use strict';

            return function() {
                return ClassRosterSvc.get($route.current.params.classId)
                    .then(function(roster) {
                        // TODO: remove this need for rootscope from subnav
                        $rootScope.currentRoster = roster;
                        return roster;
                    }, function() {
                        return $q.reject('error getting roster! ' + $route.current.params.classId);
                    });
            };
        }
    ]);
