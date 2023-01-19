angular.module('Realize.common.studentNavigation', [
    'Realize.paths'
])
    .directive('studentNavigation', [
        'PATH',
        function(PATH) {
            'use strict';

            return {
                scope: {
                    studentList: '=',
                    currentStudent: '=?',
                    onAction: '&',
                    labelSelect: '@',
                    hideNavigationButtons: '&?',
                    labelPrev: '@?',
                    labelNext: '@?'
                },
                templateUrl: PATH.TEMPLATE_ROOT +
                                '/common/studentNavigation/studentNavigation.dir.html',
                controller: function() {
                    var self = this,
                        findCurrentIndex = function(list, item) {
                            var index = list.indexOf(item);
                            return (index > 0) ? index : 0;
                        },
                        init = function() {
                            self.currentIndex = findCurrentIndex(self.studentList, self.currentStudent);
                            if (!self.currentStudent) {
                                self.displayStudent = self.studentList[self.currentIndex];
                            } else {
                                self.displayStudent = self.currentStudent;
                            }
                        };

                    self.doAction = function(currentStudent) {
                        self.displayStudent = currentStudent;
                        self.onAction({student: currentStudent});
                    };

                    self.select = function(student) {
                        self.currentIndex = findCurrentIndex(self.studentList, student);
                        self.doAction(self.studentList[self.currentIndex]);
                    };

                    self.next = function() {
                        if (self.currentIndex < self.studentList.length) {
                            self.currentIndex++;
                            self.doAction(self.studentList[self.currentIndex]);
                        }
                    };

                    self.prev = function() {
                        if (self.currentIndex > 0) {
                            self.currentIndex--;
                            self.doAction(self.studentList[self.currentIndex]);
                        }
                    };

                    self.isFirst = function() {
                        return self.currentIndex === 0;
                    };

                    self.isLast = function() {
                        return self.currentIndex === self.studentList.length - 1;
                    };

                    init();
                },
                bindToController: true,
                controllerAs: 'studentNavigationCtrl'
            };
        }
    ]);
