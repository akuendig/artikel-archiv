/*global config:true, task:true*/
config.init({
  pkg: '<json:package.json>',
  test: {
    files: ['test/**/*.js']
  },
  lint: {
    files: ['lib/**/*.js', 'test/**/*.js']
  },
  watch: {
    files: '<config:lint.files>',
    tasks: 'lint test'
  },
  jshint: {
    options: {
      curly: true,
      eqeqeq: true,
      immed: true,
      latedef: true,
      newcap: true,
      noarg: true,
      sub: true,
      undef: true,
      eqnull: true,
      node: true,
      laxcomma: true
    },
    globals: {}
  }
});
// Default task.
task.registerTask('default', 'lint test');
