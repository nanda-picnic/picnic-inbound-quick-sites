# User specification
- The goal of the app is the user to be able to upload html files and share 
it with other people in the orgnaisation easily.
- The app is only accessible to only logged in users. 
- Once they are logged in, the user is able to upload html files. They are 
  also able to create folders and organise their html files inside the folders.
- When they upload the file they can also specify if the file is public or 
  if access is restricted to other users. Also give a disclaimer not to 
  share anything very sensitive yet as this is still a project in beta.
- There should be a clear way for the user to be able to get the link of the 
  file where it will be hosted and change the acesss settings.
- It should also be possible for the user to delete a file and folders if 
  they feel its no longer needed.

# Technical specifications

- Authentication is already implemented via google oauth.
- Make sure that only users with the domain teampicnic.com can access the app
- For storing the user specific metadata(files and folders) and the raw files 
  make use of vercel blob storage.
- All of the blobs will be in private storage mode, it will only be served 
  via the app
- Every user will get a blob with his username when they log in for the 
  first time. This will contain the state 
  of his home page. All the folders, files(its urls, and access) will be 
  stored in this blob. Anytime the user adds/deletes/modified a file, folder 
  this document will also be updated.
- Each of the file that a user uploads, it will uploaded to blob storage 
  with a unique name. The logic of the unique name will consist of a base64 
  encoding of the user-name, path to file, file name from user perspective. 
- the app will have a separate path where it will serve the files. the 
  unique name of the file be in this path.
- When app receives the path, it will first decode it. Retrieve the access 
  rules of the file from the user who uploaded the file. It will check if 
  the current user can view the file. If the current user can view the file 
  it will serve the file.