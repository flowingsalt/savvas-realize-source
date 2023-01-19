angular.module('Realize.classRoster.resolves.getAll', [
    'RealizeDataServices'
])
    .factory('ClassRosterResolveGetAll', [
        'ClassRoster',
        function(ClassRosterSvc) {
            'use strict';

            return function() {
                return ClassRosterSvc.get();
            };
        }
    ]);
