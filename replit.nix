{ pkgs }: {
	deps = [
   pkgs.unzip
        pkgs.libuuid
    ];
  	env = { LD_LIBRARY_PATH = pkgs.lib.makeLibraryPath [pkgs.libuuid]; };
}
