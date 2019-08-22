var $editor_html=`
<html>
<head>
	<script src="../js/jquery-3.4.1.min.js"></script>
	<script src="https://unpkg.com/wangeditor@3.1.1/release/wangEditor.min.js"></script>
</head>
<body>
	<div id="editor">
  </div>
	<script >
			createEdit();

			function createEdit()
			{
			    var editor = window.wangEditor;
			    if(!editor)
			    {
			      //setTimeout(createEdit, 1000);
			      alert("can't get editor defination!");
			      return;
			    }
			    var editor2 = new editor('#editor');
			    editor2.create();
			}
	</script>
</body>
</html>
`