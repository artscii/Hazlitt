CREATE TABLE file_operations (id text PRIMARY KEY NOT NULL,kind text NOT NULL,filename text NOT NULL,at integer NOT NULL,status text NOT NULL,payload text NOT NULL,ip text NOT NULL,completed integer,undone integer);
--> statement-breakpoint
CREATE TABLE global_history (version integer PRIMARY KEY AUTOINCREMENT NOT NULL,at integer NOT NULL,action text NOT NULL,operation_id text NOT NULL,summary text NOT NULL,details text NOT NULL,ip text NOT NULL);
