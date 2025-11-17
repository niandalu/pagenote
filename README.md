# PageNote

> A chrome plugin for personal use, feel free to fork

Page Note is a chrome extension for annotating text on web pages.

You can select text and annotate it with color and text notes. The notes are saved in a local database and can be replayed when page reopened.

These annotations can be exported in JSON format. This makes it possible to persist annotations into your Obsidian or Anki cards.


## Feaetures

### Annotate

Once you select a range of text, a floating icon appears in the upper right corner.

When the icon is clicked, the selected text is colored.

If you click the icon again, a sidebar will appear and you can add notes to the selected text. Also, you can remove the annotation here.

### Manage Annotation

You can overview the annotations under current page, by clicking the extension icon on the browser toolbar.

Here is the place you can edit, delete and export annotations.

### Export

Under annotation management page, you can export annotations to a JSON file.


## Design

There are 3 main parts of the extension:
1. ContentScript, it is in charge of drawing annotations upon texts
2. BackgroundScript, it is in charge of saving and loading annotations. It syncs annotations between ContentScript and SidePanel
3. SidePanel, it is in charge of managing annotations, like edit, delete and export annotations
