# mimic

Tools to manage and share large collections of files.

With Mimic, collections of files can be transfered using HTTP, SCP and FTP protocols.

## Installation
```shell
npm install mimic
```

## Using Mimic

Make a local copy (clone) of a collection in the current folder (.):
```shell
mimic-clone -v -i https://pds-ppi.igpp.ucla.edu/data/VG2-U-PWS-4-SUMM-SA-48SEC-V1.0 .
```

Update the collection in the current folder (.)
```shell
mimic-pull -v .
```
Create a Mimic collection (init and add)
```shell
mimic-init -v .
mimic-add -v -r .
```

Updating a Mimic collection (refresh)
```shell
mimic-refresh -v .
```

**Sharing a Mimic collection**

Place all the files, including the ".mimic" folder on a web server, then use the URL to the home folder
to share and copy the files.

## Tools

Mimic has a variety of tools for managing collections of files. Run the tool with no command-line 
options to view information about available options.

**mimic-add** : Add new files to the inventory of a Mimic managed collection.

**mimic-clone** :  Make a local copy (clone) of a Mimic managed collection.

**mimic-config** : Configure synchronization with Mimic collections on a remote hosts.

**mimic-download** : Download files listing in an inventory (package) using Mimic.

**mimic-info** : Display information about a Mimic managed collection including connections and inventory summary.

**mimic-init** : Initialize a Mimic managed collection.

**mimic-prune** : Prune (remove) enties from a Mimic managed collection that begin with a given path.

**mimic-pull** : Synchronize the local copy of a Mimic collection with the source collection.

**mimic-refresh** : Add new files, remove missing files and update entries for changed files in the Mimic managed collection.

**mimic-status** : Check the status of Mimic managed collection.

**mimic-tree** : List the file tree. Optionally list only files with a given extension.