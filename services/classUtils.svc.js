angular.module('RealizeApp')
    .service('ClassUtil', [
        function() {
            'use strict';

            //TODO unit test
            this.hasAtLeastOneStudentInRosters = function(rosters) {
                var studentIdList = _.chain(rosters)
                                    .pluck('studentIds')
                                    .flatten()
                                    .value(),

                    validStudentIdList = _.filter(studentIdList, function(studentId) {
                        return angular.isDefined(studentId);
                    });

                var hasAtLeastOneStudent = validStudentIdList.length > 0;

                return hasAtLeastOneStudent;
            };

            this.hasAtLeastOneClassWithProduct = function(rosters, classesWithoutProduct) {
                return classesWithoutProduct.length === 0 || rosters.length !== classesWithoutProduct.length;
            };
        }
    ]);
