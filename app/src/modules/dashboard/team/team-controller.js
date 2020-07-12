/* global angular */
(function () {
    'use strict';
    angular.module('app.home')
            .controller('TeamController', TeamController);

    TeamController.$inject = ['$timeout', 'apicURLS', 'toastr', '$rootScope', '$confirm','TeamService'];
    function TeamController($timeout, apicURLS, toastr, $rootScope, $confirm,TeamService) {
        var vm = this;
        vm.flags = {
            loading: false,
            inEdit: false,
            saving: false,
            new : false,
            creating: false,
            finding: false,
            membersOf: false,
            members: false
        };
        vm.data = [];
        vm.selectedName = '';
        vm.newMember = {
            email: '',
            role: '1'
        };
        vm.selected = {};

        vm.getTeams = getTeams;
        vm.createTeam = createTeam;
        vm.showCreate = showCreate;
        vm.edit = edit;
        vm.deleteTeam = deleteTeam;
        vm.updateTeam = updateTeam;
        vm.deleteMember = deleteMember;
        vm.addMember = addMember;
        vm.exitTeam = exitTeam;
        vm.reload = reload;

        init();
        function init() {
            getTeams();
        }

        function createTeam() {
            if (!vm.newName) {
                toastr.error('Please enter a team name.');
                return;
            }
            vm.flags.creating = true;
            TeamService.create(vm.newName).then(function (data) {
                if (data) {
                    if (data.status === 'ok') {
                        vm.flags.new = false;
                        vm.newName = '';
                        getTeams();
                    } else {
                        toastr.error('Failed to create team. ' + data.desc);
                    }
                } else {
                    toastr.error('Failed to create team.');
                }
                vm.flags.creating = false;
            });
        }

        function getTeams() {
            vm.flags.loading = true;
            TeamService.getList().then(function (data) {
                if (data) {
                    if (data.status === 'ok') {
                        vm.data = data.resp;
                    } else {
                        toastr.error(data.desc);
                    }
                } else {
                    toastr.error('Failed to load your teams.');
                }
                vm.flags.loading = false;
                getMembersOf();
            });
        }

        function showCreate() {
            vm.flags.new = true;
            $timeout(function () {
                angular.element('#newTeam').focus();
            });
        }

        function edit(team) {
            vm.selected = angular.copy(team);
            vm.flags.inEdit = true;
            vm.selectedName = vm.selected.name;
            $timeout(function () {
                angular.element('#teamName').focus();
            });
        }

        function deleteTeam(id) {
            vm.flags.loading = true;
            TeamService.delete(id).then(function (data) {
                vm.flags.loading = false;
                if (data) {
                    if (data.status === 'ok') {
                        getTeams();
                        toastr.success('Team deleted.');
                    } else {
                        toastr.error(data.desc);
                    }
                } else {
                    toastr.error('Failed to delete team.');
                }
            });
        }

        function updateTeam() {
            vm.selected.modified = new Date().getTime();
            vm.flags.saving = true;
            TeamService.update(vm.selected).then(function (data) {
                if (data) {
                    if (data.status === 'ok') {
                        toastr.success('Team updated.');
                    } else {
                        toastr.error(data.desc);
                    }
                } else {
                    toastr.error('Failed to update team.');
                }
                vm.flags.saving = false;
            });
        }

        function getTeamMembers(teamId) {
            vm.flags.members = true;
            TeamService.getMembers(teamId).then(function (data) {
                if (data) {
                    if (data.status === 'ok') {
                        vm.selected.members = data.resp;
                    } else {
                        toastr.error(data.desc);
                    }
                } else {
                    toastr.error('Failed to remove user.');
                }
                vm.flags.members = false;
            });
        }

        function deleteMember(userId) {
            vm.flags.members = true;
            TeamService.deleteMember(vm.selected.id, userId).then(function (data) {
                if (data) {
                    if (data.status === 'ok') {
                        toastr.success('User removed from team.');
                        getTeamMembers(vm.selected.id);
                    } else {
                        toastr.error(data.desc);
                    }
                } else {
                    toastr.error('Failed to remove user.');
                }
                vm.flags.members = false;
            });
        }

        function addMember() {
            if (!vm.newMember.email) {
                toastr.error('Please enter an email id');
                return;
            }
            vm.flags.finding = true;
            TeamService.addMember(vm.selected.id, vm.newMember).then(function (data) {
                if (data) {
                    if (data.status === 'ok') {
                        toastr.success(data.desc);
                        vm.selected = data.resp;
                    } else {
                        if (data.desc === 'The specified email is not registered with APIC.') {
                            $confirm({text: data.desc + ' Would you like to send an invite to join APIC?', title: 'Invite User', ok: 'Invite', cancel: 'May be later'})
                                    .then(function () {
                                        toastr.info('Inviting user ro join APIC.');
                                        invite(vm.newMember.email);
                                    });
                        }
                        toastr.error(data.desc);
                    }
                } else {
                    toastr.error('User not found.');
                }
                vm.flags.finding = false;
            });
        }

        function reload() {
            vm.getTeams();
            vm.flags.inEdit = false;
            vm.selected = {};
            vm.selectedName = '';
        }

        function getMembersOf() {
            vm.flags.membersOf = true;
            TeamService.getMembersOf($rootScope.userData.UID).then(function (data) {
                if (data) {
                    if (data.status === 'ok') {
                        vm.memberOf = data.resp;
                    } else {
                        toastr.error(data.desc);
                    }
                } else {
                    toastr.error('Failed to load teams which you are member of.');
                }
                vm.flags.membersOf = false;
            });
        }

        function exitTeam(teamId) {
            vm.flags.exiting = true;
            TeamService.exit(teamId).then(function (data) {
                if (data) {
                    if (data.status === 'ok') {
                        toastr.success('Left team.');
                        getMembersOf();
                    } else {
                        toastr.error(data.desc);
                    }
                } else {
                    toastr.error('Failed to exit team.');
                }
                vm.flags.exiting = false;
            });
        }
        
        function invite(email){
            var emailsToInvite = email instanceof Array? email : [email];
            TeamService.invite({data: emailsToInvite}).then(function (data){
                if (data) {
                    if (data.status === 'ok') {
                        toastr.success(data.desc+ '  '+data.resp.join(','));
                    } else {
                        toastr.error(data.desc);
                    }
                } else {
                    toastr.error('Failed to invite User.');
                }
            });
        }
    }
})();